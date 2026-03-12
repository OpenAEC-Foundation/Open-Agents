import subprocess, json, time, threading, uuid
from http.server import HTTPServer, BaseHTTPRequestHandler

# Shared server-side conversation state
conversation = []  # [{role, content, sender, timestamp}]
conversation_lock = threading.Lock()
last_update = [time.time()]

HTML = '''<!DOCTYPE html>
<html>
<head>
<title>Hetzner Opus Chat</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1a1a2e; color: #eee; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; }
#header { padding: 16px 24px; background: #16213e; border-bottom: 1px solid #333; font-size: 18px; font-weight: bold; color: #e94560; }
#header span { color: #aaa; font-size: 13px; font-weight: normal; margin-left: 12px; }
#messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
.msg { max-width: 85%; padding: 12px 16px; border-radius: 12px; line-height: 1.5; white-space: pre-wrap; }
.msg .sender { font-size: 11px; opacity: 0.6; margin-bottom: 4px; }
.user { background: #e94560; align-self: flex-end; }
.assistant { background: #16213e; border: 1px solid #333; align-self: flex-start; }
.freek { background: #0f3460; border: 1px solid #e94560; align-self: flex-end; }
.claude { background: #1a3a1a; border: 1px solid #4caf50; align-self: flex-start; }
.thinking { color: #888; font-style: italic; }
#input-area { padding: 16px 24px; background: #16213e; border-top: 1px solid #333; display: flex; gap: 12px; align-items: center; }
#name { width: 100px; padding: 12px; background: #0f3460; border: 1px solid #333; border-radius: 8px; color: #eee; font-size: 13px; outline: none; }
#input { flex: 1; padding: 12px 16px; background: #0f3460; border: 1px solid #333; border-radius: 8px; color: #eee; font-size: 15px; outline: none; }
#send { padding: 12px 24px; background: #e94560; border: none; border-radius: 8px; color: white; font-size: 15px; cursor: pointer; }
#send:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
</head>
<body>
<div id="header">Gedeelde Chat <span>claude-opus-4-6 &middot; Hetzner &middot; meerdere deelnemers</span></div>
<div id="messages"></div>
<div id="input-area">
  <input id="name" value="freek" placeholder="naam" />
  <input id="input" placeholder="Type je bericht..." autofocus />
  <button id="send" onclick="sendMsg()">Stuur</button>
</div>
<script>
let lastCount = 0;

const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const nameInput = document.getElementById("name");
const msgsDiv = document.getElementById("messages");

input.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
});

function addMsg(msg) {
  const isAssistant = msg.role === "assistant";
  const sender = msg.sender || (isAssistant ? "claude" : "user");
  const outer = document.createElement("div");
  outer.className = "msg " + (isAssistant ? "assistant" : "freek");
  outer.id = "msg-" + msg.id;
  const senderEl = document.createElement("div");
  senderEl.className = "sender";
  senderEl.textContent = sender;
  const contentEl = document.createElement("div");
  contentEl.textContent = msg.content;
  outer.appendChild(senderEl);
  outer.appendChild(contentEl);
  msgsDiv.appendChild(outer);
  msgsDiv.scrollTop = msgsDiv.scrollHeight;
  return outer;
}

async function poll() {
  try {
    const res = await fetch("/history?since=" + lastCount);
    const data = await res.json();
    if (data.messages && data.messages.length > 0) {
      data.messages.forEach(addMsg);
      lastCount = data.total;
    }
  } catch(e) {}
  setTimeout(poll, 1500);
}

async function sendMsg() {
  const text = input.value.trim();
  const sender = nameInput.value.trim() || "freek";
  if (!text || sendBtn.disabled) return;
  input.value = "";
  sendBtn.disabled = true;

  await fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text, sender: sender })
  });

  sendBtn.disabled = false;
  input.focus();
}

poll();
</script>
</body>
</html>'''


def call_claude(history):
    prompt = ''
    for m in history[:-1]:
        role = 'Human' if m['role'] == 'user' else 'Assistant'
        prompt += f"{role}: {m['content']}\n\n"
    prompt += f"Human: {history[-1]['content']}"
    result = subprocess.run(
        ['claude', '-p', prompt],
        capture_output=True, text=True, timeout=180
    )
    return result.stdout.strip() or result.stderr.strip() or '(geen antwoord)'


def process_message(content, sender):
    """Add user message, call claude, add response — all in shared state."""
    with conversation_lock:
        msg_id = str(uuid.uuid4())[:8]
        conversation.append({'id': msg_id, 'role': 'user', 'content': content, 'sender': sender})
        history_snapshot = list(conversation)
    last_update[0] = time.time()

    reply = call_claude(history_snapshot)

    with conversation_lock:
        resp_id = str(uuid.uuid4())[:8]
        conversation.append({'id': resp_id, 'role': 'assistant', 'content': reply, 'sender': 'claude'})
    last_update[0] = time.time()


class ChatHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML.encode('utf-8'))

        elif self.path.startswith('/history'):
            since = 0
            if 'since=' in self.path:
                try:
                    since = int(self.path.split('since=')[1])
                except:
                    pass
            with conversation_lock:
                new_msgs = conversation[since:]
                total = len(conversation)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'messages': new_msgs, 'total': total}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        length = int(self.headers['Content-Length'])
        data = json.loads(self.rfile.read(length))

        if self.path == '/send':
            content = data.get('content', '')
            sender = data.get('sender', 'freek')
            threading.Thread(target=process_message, args=(content, sender), daemon=True).start()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok": true}')

        elif self.path == '/inject':
            # For Claude Code (me) to inject messages
            content = data.get('content', '')
            sender = data.get('sender', 'claude-code')
            skip_claude = data.get('skip_claude', False)
            with conversation_lock:
                msg_id = str(uuid.uuid4())[:8]
                conversation.append({'id': msg_id, 'role': 'user' if not skip_claude else 'assistant',
                                     'content': content, 'sender': sender})
            if not skip_claude:
                threading.Thread(target=process_message, args=(content, sender), daemon=True).start()
            last_update[0] = time.time()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == '__main__':
    port = 7123
    server = HTTPServer(('0.0.0.0', port), ChatHandler)
    print(f'Gedeelde chat server op http://0.0.0.0:{port}')
    server.serve_forever()
