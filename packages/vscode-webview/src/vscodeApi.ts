/** Type-safe wrapper around VS Code's webview API */

// Re-use the bridge types from the extension package
export interface ExtensionSettings {
  apiUrl: string;
  defaultModel: string;
  theme: string;
}

// Messages we send to the extension
export type WebviewToExtension =
  | { type: "saveState"; payload: string }
  | { type: "loadState" }
  | { type: "getSettings" }
  | { type: "canvasChanged"; payload: string };

// Messages we receive from the extension
export type ExtensionToWebview =
  | { type: "stateLoaded"; payload: string | null }
  | { type: "settings"; payload: ExtensionSettings }
  | { type: "action"; action: string }
  | { type: "configsUpdated"; payload: unknown }
  | { type: "presetsReloaded" };

interface VsCodeApi {
  postMessage(msg: WebviewToExtension): void;
  getState<T>(): T | undefined;
  setState<T>(state: T): void;
}

let api: VsCodeApi | undefined;

/** Get VS Code API (returns null if not running inside a webview) */
export function getVsCodeApi(): VsCodeApi | null {
  if (api) return api;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api = (window as any).acquireVsCodeApi();
    return api!;
  } catch {
    return null; // Not in VS Code — standalone dev mode
  }
}

/** Check if we're running inside a VS Code webview */
export function isVsCodeWebview(): boolean {
  return getVsCodeApi() !== null;
}

/** Send a message to the extension host */
export function postToExtension(msg: WebviewToExtension): void {
  getVsCodeApi()?.postMessage(msg);
}

/** Listen for messages from the extension host */
export function onExtensionMessage(
  handler: (msg: ExtensionToWebview) => void,
): () => void {
  const listener = (event: MessageEvent) => handler(event.data);
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
