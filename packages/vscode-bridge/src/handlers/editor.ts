import * as vscode from "vscode";
import type {
  ActiveEditorResponse,
  OpenFilesResponse,
  OpenFileRequest,
  OpenFileResponse,
  CloseEditorRequest,
  GetTextRequest,
  GetTextResponse,
  InsertTextRequest,
  ReplaceTextRequest,
  SetCursorRequest,
} from "../shared";

export async function getActiveEditor(): Promise<ActiveEditorResponse> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return {
      filePath: null,
      languageId: null,
      cursor: null,
      selection: null,
      isDirty: false,
      lineCount: 0,
      viewColumn: null,
    };
  }

  const sel = editor.selection;
  return {
    filePath: editor.document.uri.fsPath,
    languageId: editor.document.languageId,
    cursor: { line: sel.active.line, character: sel.active.character },
    selection: sel.isEmpty
      ? null
      : {
          anchor: { line: sel.anchor.line, character: sel.anchor.character },
          active: { line: sel.active.line, character: sel.active.character },
          text: editor.document.getText(sel),
        },
    isDirty: editor.document.isDirty,
    lineCount: editor.document.lineCount,
    viewColumn: editor.viewColumn ?? null,
  };
}

export async function getOpenFiles(): Promise<OpenFilesResponse> {
  const tabs = vscode.window.tabGroups.all.flatMap((group) =>
    group.tabs.map((tab) => ({
      tab,
      viewColumn: group.viewColumn,
    })),
  );

  const files = tabs
    .filter((t) => t.tab.input instanceof vscode.TabInputText)
    .map((t) => {
      const input = t.tab.input as vscode.TabInputText;
      return {
        filePath: input.uri.fsPath,
        languageId: "", // populated below if document is open
        isDirty: t.tab.isDirty,
        isPinned: t.tab.isPinned,
        viewColumn: t.viewColumn,
      };
    });

  // Enrich with language ID from open documents
  for (const file of files) {
    const doc = vscode.workspace.textDocuments.find(
      (d) => d.uri.fsPath === file.filePath,
    );
    if (doc) {
      file.languageId = doc.languageId;
    }
  }

  return { files };
}

export async function openFile(body: unknown): Promise<OpenFileResponse> {
  const req = body as OpenFileRequest;
  const uri = vscode.Uri.file(req.path);
  const doc = await vscode.workspace.openTextDocument(uri);
  const options: vscode.TextDocumentShowOptions = {
    preview: req.preview ?? true,
    viewColumn: req.viewColumn as vscode.ViewColumn | undefined,
  };

  const editor = await vscode.window.showTextDocument(doc, options);

  if (req.line !== undefined) {
    const line = Math.max(0, req.line - 1);
    const char = Math.max(0, (req.character ?? 1) - 1);
    const pos = new vscode.Position(line, char);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos));
  }

  return { success: true, filePath: doc.uri.fsPath };
}

export async function closeEditor(body: unknown): Promise<{ success: boolean }> {
  const req = body as CloseEditorRequest;
  if (req.all) {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  } else if (req.path) {
    const uri = vscode.Uri.file(req.path);
    const doc = vscode.workspace.textDocuments.find(
      (d) => d.uri.fsPath === uri.fsPath,
    );
    if (doc) {
      await vscode.window.showTextDocument(doc, { preview: false });
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor",
      );
    }
  } else {
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  }
  return { success: true };
}

export async function getText(body: unknown): Promise<GetTextResponse> {
  const req = body as GetTextRequest;

  let doc: vscode.TextDocument;
  if (req.path) {
    const uri = vscode.Uri.file(req.path);
    doc = await vscode.workspace.openTextDocument(uri);
  } else {
    const editor = vscode.window.activeTextEditor;
    if (!editor) throw new Error("No active editor");
    doc = editor.document;
  }

  const startLine = Math.max(0, (req.startLine ?? 1) - 1);
  const endLine = Math.min(doc.lineCount, req.endLine ?? doc.lineCount);
  const range = new vscode.Range(startLine, 0, endLine, 0);
  const text = doc.getText(range);

  return {
    text,
    filePath: doc.uri.fsPath,
    startLine: startLine + 1,
    endLine,
  };
}

export async function insertText(body: unknown): Promise<{ success: boolean }> {
  const req = body as InsertTextRequest;

  let editor: vscode.TextEditor;
  if (req.path) {
    const uri = vscode.Uri.file(req.path);
    const doc = await vscode.workspace.openTextDocument(uri);
    editor = await vscode.window.showTextDocument(doc);
  } else {
    editor = vscode.window.activeTextEditor!;
    if (!editor) throw new Error("No active editor");
  }

  const line = Math.max(0, req.line - 1);
  const pos = new vscode.Position(line, 0);
  await editor.edit((editBuilder) => {
    editBuilder.insert(pos, req.text);
  });

  return { success: true };
}

export async function replaceText(body: unknown): Promise<{ success: boolean }> {
  const req = body as ReplaceTextRequest;

  let editor: vscode.TextEditor;
  if (req.path) {
    const uri = vscode.Uri.file(req.path);
    const doc = await vscode.workspace.openTextDocument(uri);
    editor = await vscode.window.showTextDocument(doc);
  } else {
    editor = vscode.window.activeTextEditor!;
    if (!editor) throw new Error("No active editor");
  }

  const startLine = Math.max(0, req.startLine - 1);
  const endLine = Math.max(0, req.endLine);
  const range = new vscode.Range(startLine, 0, endLine, 0);
  await editor.edit((editBuilder) => {
    editBuilder.replace(range, req.text);
  });

  return { success: true };
}

export async function setCursor(body: unknown): Promise<{ success: boolean }> {
  const req = body as SetCursorRequest;
  const editor = vscode.window.activeTextEditor;
  if (!editor) throw new Error("No active editor");

  const line = Math.max(0, req.line - 1);
  const char = Math.max(0, (req.character ?? 1) - 1);
  const pos = new vscode.Position(line, char);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos));

  return { success: true };
}

export async function revealLine(body: unknown): Promise<{ success: boolean }> {
  const req = body as { line: number };
  const editor = vscode.window.activeTextEditor;
  if (!editor) throw new Error("No active editor");

  const line = Math.max(0, req.line - 1);
  const range = new vscode.Range(line, 0, line, 0);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

  return { success: true };
}

export async function saveFile(body: unknown): Promise<{ success: boolean }> {
  const req = body as { path?: string };

  if (req.path) {
    const uri = vscode.Uri.file(req.path);
    const doc = vscode.workspace.textDocuments.find(
      (d) => d.uri.fsPath === uri.fsPath,
    );
    if (doc) await doc.save();
  } else {
    const editor = vscode.window.activeTextEditor;
    if (editor) await editor.document.save();
  }

  return { success: true };
}
