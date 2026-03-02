/** Configurable API base URL. Default works with Vite proxy in standalone mode. */
let apiBase = "/api";

export function setApiBase(url: string) {
  apiBase = url.replace(/\/$/, ""); // strip trailing slash
}

export function getApiBase(): string {
  return apiBase;
}
