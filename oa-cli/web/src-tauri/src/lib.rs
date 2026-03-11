use std::io::{Read, Write};
use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, State,
};

struct PythonBridge {
    process: Mutex<Option<Child>>,
}

struct BridgeHealthState {
    alive: Mutex<bool>,
    restart_count: Mutex<u32>,
}

fn start_python_bridge() -> Result<Child, String> {
    // Spawn the Flask bridge as a child process
    let child = Command::new("python3")
        .args(["-m", "open_agents.bridge", "--port", "5174"])
        .spawn()
        .map_err(|e| format!("Failed to start Python bridge: {}", e))?;

    // Give the server a moment to start
    std::thread::sleep(Duration::from_secs(2));

    Ok(child)
}

fn check_bridge_http_health() -> bool {
    if let Ok(mut stream) = TcpStream::connect("127.0.0.1:5174") {
        stream.set_read_timeout(Some(Duration::from_secs(3))).ok();
        stream.set_write_timeout(Some(Duration::from_secs(3))).ok();
        let request = "GET /api/health HTTP/1.0\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
        if stream.write_all(request.as_bytes()).is_ok() {
            let mut response = String::new();
            stream.read_to_string(&mut response).ok();
            return response.starts_with("HTTP/1.") && response.contains("200");
        }
    }
    false
}

fn start_watchdog(app_handle: AppHandle) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(5));

            let alive = check_bridge_http_health();

            let health_state: State<BridgeHealthState> = app_handle.state();
            *health_state.alive.lock().unwrap() = alive;

            if !alive {
                let restart_count = {
                    let count = health_state.restart_count.lock().unwrap();
                    *count
                };

                if restart_count < 3 {
                    eprintln!(
                        "Watchdog: bridge unresponsive, restarting (attempt {}/3)",
                        restart_count + 1
                    );

                    let bridge_state: State<PythonBridge> = app_handle.state();
                    let mut guard = bridge_state.process.lock().unwrap();

                    if let Some(ref mut child) = *guard {
                        let _ = child.kill();
                        let _ = child.wait();
                    }

                    match start_python_bridge() {
                        Ok(child) => {
                            *guard = Some(child);
                            drop(guard);
                            let mut count = health_state.restart_count.lock().unwrap();
                            *count += 1;
                            println!("Watchdog: bridge restarted successfully");
                        }
                        Err(e) => {
                            eprintln!("Watchdog: failed to restart bridge: {}", e);
                            drop(guard);
                            let mut count = health_state.restart_count.lock().unwrap();
                            *count += 1;
                        }
                    }
                } else {
                    eprintln!("Watchdog: max restart attempts (3) reached, giving up");
                }
            } else {
                // Reset restart count when bridge is healthy again
                let mut count = health_state.restart_count.lock().unwrap();
                *count = 0;
            }
        }
    });
}

#[tauri::command]
fn get_bridge_status(state: State<PythonBridge>) -> bool {
    let guard = state.process.lock().unwrap();
    if let Some(ref _child) = *guard {
        // Check if process is still running
        true
    } else {
        false
    }
}

#[tauri::command]
fn get_bridge_health(state: State<BridgeHealthState>) -> serde_json::Value {
    let alive = *state.alive.lock().unwrap();
    let restart_count = *state.restart_count.lock().unwrap();
    serde_json::json!({
        "alive": alive,
        "restart_count": restart_count,
        "max_restarts": 3
    })
}

#[tauri::command]
fn restart_bridge(state: State<PythonBridge>) -> Result<String, String> {
    let mut guard = state.process.lock().unwrap();

    // Kill existing process if running
    if let Some(ref mut child) = *guard {
        let _ = child.kill();
        let _ = child.wait();
    }

    // Start new process
    let child = start_python_bridge()?;
    *guard = Some(child);

    Ok("Bridge restarted".to_string())
}

#[tauri::command]
async fn invoke_oa(cmd: String, args: Vec<String>) -> Result<serde_json::Value, String> {
    // Build PATH that includes oa-cli location
    let path_env = "/home/freek/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";

    let output = tauri::async_runtime::spawn_blocking(move || {
        Command::new("oa")
            .arg(&cmd)
            .args(&args)
            .env("PATH", path_env)
            .output()
            .map_err(|e| format!("Failed to execute 'oa {}': {}", cmd, e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "oa command failed (exit {}): {}{}",
            output.status.code().unwrap_or(-1),
            stderr.trim(),
            if stdout.trim().is_empty() { "".to_string() } else { format!("\n{}", stdout.trim()) }
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    // Try to parse as JSON, otherwise return as string value
    match serde_json::from_str::<serde_json::Value>(&stdout) {
        Ok(json) => Ok(json),
        Err(_) => Ok(serde_json::Value::String(stdout.trim().to_string())),
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            // Start Python bridge on app launch
            match start_python_bridge() {
                Ok(child) => {
                    app.manage(PythonBridge {
                        process: Mutex::new(Some(child)),
                    });
                    println!("Python bridge started successfully");
                }
                Err(e) => {
                    eprintln!("Warning: Could not start Python bridge: {}", e);
                    app.manage(PythonBridge {
                        process: Mutex::new(None),
                    });
                }
            }

            // Register bridge health state
            app.manage(BridgeHealthState {
                alive: Mutex::new(false),
                restart_count: Mutex::new(0),
            });

            // Start watchdog thread
            let app_handle = app.handle().clone();
            start_watchdog(app_handle);

            // Build system tray menu
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Open Agents", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Open Agents")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Kill Python bridge when window closes
                let state: State<PythonBridge> = window.state();
                let mut guard = state.process.lock().unwrap();
                if let Some(ref mut child) = *guard {
                    let _ = child.kill();
                    let _ = child.wait();
                    println!("Python bridge stopped");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_bridge_status,
            get_bridge_health,
            restart_bridge,
            invoke_oa,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
