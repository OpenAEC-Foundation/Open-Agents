import { invoke } from '@tauri-apps/api/core';

export const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Invoke an oa-cli command from the Tauri desktop app.
 * Equivalent to running: oa <cmd> [...args] in the terminal.
 *
 * @example
 * await invokeOa('status')
 * await invokeOa('run', ['my task', '--name', 'agent1', '--model', 'claude/sonnet', '--direct'])
 */
export async function invokeOa(cmd: string, args: string[] = []): Promise<unknown> {
  if (!IS_TAURI) {
    throw new Error('invokeOa is only available in the Tauri desktop app');
  }
  return invoke('invoke_oa', { cmd, args });
}
