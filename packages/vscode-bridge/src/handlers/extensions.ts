import * as vscode from "vscode";
import type { ListExtensionsResponse } from "../shared";

export async function listExtensions(): Promise<ListExtensionsResponse> {
  const extensions = vscode.extensions.all.map((ext) => ({
    id: ext.id,
    displayName: ext.packageJSON?.displayName ?? ext.id,
    version: ext.packageJSON?.version ?? "unknown",
    isActive: ext.isActive,
    isBuiltin: ext.packageJSON?.isBuiltin ?? false,
  }));

  return { extensions };
}
