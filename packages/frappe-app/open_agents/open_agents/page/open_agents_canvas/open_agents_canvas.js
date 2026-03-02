/**
 * Open Agents Canvas — Frappe Page
 *
 * Embeds the Open-Agents React SPA canvas inside Frappe Desk.
 * The canvas runs as a standalone app loaded via iframe, with
 * a postMessage bridge for Frappe ↔ Canvas communication.
 */
frappe.pages["open-agents-canvas"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("Open Agents Canvas"),
    single_column: true,
  });

  // Read canvas URL from site config or default to localhost dev server
  const canvasUrl =
    frappe.boot.open_agents_canvas_url || "http://localhost:5173";

  // Create the iframe container
  const container = document.createElement("div");
  container.id = "open-agents-canvas-container";
  container.style.cssText =
    "width:100%;height:calc(100vh - 120px);position:relative;";

  const iframe = document.createElement("iframe");
  iframe.id = "open-agents-canvas-iframe";
  iframe.src = canvasUrl;
  iframe.style.cssText =
    "width:100%;height:100%;border:none;border-radius:8px;";
  iframe.allow = "clipboard-write";

  // Loading state
  const loader = document.createElement("div");
  loader.id = "open-agents-canvas-loader";
  loader.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">
      <div class="spinner-border" role="status" style="width:3rem;height:3rem;margin-bottom:1rem;"></div>
      <p>${__("Loading Open Agents Canvas...")}</p>
      <p style="font-size:0.85em;color:var(--text-light);">
        ${__("Connecting to")} ${canvasUrl}
      </p>
    </div>
  `;
  loader.style.cssText =
    "position:absolute;inset:0;background:var(--bg-color);z-index:10;";

  container.appendChild(loader);
  container.appendChild(iframe);
  page.main.html(container);

  // Hide loader when iframe loads
  iframe.addEventListener("load", function () {
    loader.style.display = "none";
  });

  // Error handling: show message if canvas is unreachable
  iframe.addEventListener("error", function () {
    loader.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">
        <i class="fa fa-exclamation-triangle" style="font-size:3rem;margin-bottom:1rem;color:var(--red-500);"></i>
        <p>${__("Could not connect to Open Agents Canvas")}</p>
        <p style="font-size:0.85em;">${__("Make sure the canvas server is running at")} ${canvasUrl}</p>
        <button class="btn btn-primary btn-sm" onclick="location.reload()">
          ${__("Retry")}
        </button>
      </div>
    `;
  });

  // PostMessage bridge: Frappe → Canvas
  page.open_agents = {
    iframe: iframe,

    /** Send a message to the canvas iframe */
    postMessage: function (type, payload) {
      iframe.contentWindow.postMessage({ source: "frappe", type, payload }, "*");
    },

    /** Load a specific canvas config by ID */
    loadConfig: function (configId) {
      this.postMessage("load-config", { configId });
    },

    /** Execute the current canvas */
    executeCanvas: function () {
      this.postMessage("execute", {});
    },
  };

  // PostMessage bridge: Canvas → Frappe
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.source !== "open-agents-canvas") return;

    const { type, payload } = event.data;

    switch (type) {
      case "config-saved":
        frappe.show_alert({
          message: __("Canvas config saved: {0}", [payload.name || payload.id]),
          indicator: "green",
        });
        break;

      case "execution-complete":
        frappe.show_alert({
          message: __("Execution complete"),
          indicator: "green",
        });
        break;

      case "execution-error":
        frappe.show_alert({
          message: __("Execution error: {0}", [payload.error]),
          indicator: "red",
        });
        break;

      case "canvas-ready":
        // Canvas SPA has finished loading and is ready for messages
        loader.style.display = "none";
        break;
    }
  });

  // Page menu actions
  page.add_menu_item(__("Reload Canvas"), function () {
    iframe.src = iframe.src;
    loader.style.display = "";
  });

  page.add_menu_item(__("Open in New Tab"), function () {
    window.open(canvasUrl, "_blank");
  });

  page.set_indicator("Blue", __("Canvas"));
};
