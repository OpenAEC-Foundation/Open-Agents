// =============================================
// Anthropic Authentication Helper
// Tries BYOK key first, falls back to Claude Code OAuth credentials.
// This allows the platform to work without a separate API key
// when running inside a Claude Code session.
// =============================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { getApiKey } from "./key-store.js";

interface ClaudeCredentials {
  claudeAiOauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

let cachedOAuthToken: string | null = null;
let cachedOAuthExpiry: number | null = null;

/**
 * Read Claude Code OAuth token from ~/.claude/.credentials.json.
 * Returns null if file doesn't exist or token is expired.
 */
function readClaudeOAuthToken(): string | null {
  // Use cache if token is still valid (with 60s buffer)
  if (cachedOAuthToken && cachedOAuthExpiry && Date.now() < cachedOAuthExpiry - 60_000) {
    return cachedOAuthToken;
  }

  try {
    const credPath = join(homedir(), ".claude", ".credentials.json");
    const raw = readFileSync(credPath, "utf-8");
    const creds: ClaudeCredentials = JSON.parse(raw);

    if (!creds.claudeAiOauth?.accessToken) return null;

    const { accessToken, expiresAt } = creds.claudeAiOauth;

    // Check if token is expired (with 60s buffer)
    if (expiresAt && Date.now() > expiresAt - 60_000) {
      console.warn("[anthropic-auth] Claude Code OAuth token is expired");
      return null;
    }

    cachedOAuthToken = accessToken;
    cachedOAuthExpiry = expiresAt;
    return accessToken;
  } catch {
    return null;
  }
}

/**
 * Get authentication headers for the Anthropic Messages API.
 *
 * Priority:
 * 1. BYOK key from key-store → `x-api-key` header
 * 2. Claude Code OAuth token → `Authorization: Bearer` header
 *
 * Returns null if no auth is available.
 */
export function getAnthropicAuthHeaders(): Record<string, string> | null {
  // Priority 1: BYOK API key
  const byokKey = getApiKey("anthropic");
  if (byokKey) {
    return { "x-api-key": byokKey };
  }

  // Priority 2: Claude Code OAuth token
  const oauthToken = readClaudeOAuthToken();
  if (oauthToken) {
    return { Authorization: `Bearer ${oauthToken}` };
  }

  return null;
}

/**
 * Check if any Anthropic authentication is available
 * (BYOK key or Claude Code OAuth).
 */
export function hasAnthropicAuth(): boolean {
  return getAnthropicAuthHeaders() !== null;
}
