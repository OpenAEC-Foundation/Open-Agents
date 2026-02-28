/** Type-safe postMessage protocol between extension host and webview */

// Messages from webview -> extension
export type WebviewToExtension =
  | { type: "saveState"; payload: string }
  | { type: "loadState" }
  | { type: "getSettings" }
  | { type: "canvasChanged"; payload: string };

// Messages from extension -> webview
export type ExtensionToWebview =
  | { type: "stateLoaded"; payload: string | null }
  | { type: "settings"; payload: ExtensionSettings }
  | { type: "action"; action: string }
  | { type: "configsUpdated"; payload: unknown }
  | { type: "presetsReloaded" };

export interface ExtensionSettings {
  apiUrl: string;
  defaultModel: string;
  theme: string;
}
