import * as vscode from "vscode";
import type {
  FileExistsResponse,
  ReadFileRequest,
  ReadFileResponse,
  WriteFileRequest,
  DeleteFileRequest,
  RenameFileRequest,
  CreateDirectoryRequest,
  ListDirectoryRequest,
  ListDirectoryResponse,
} from "../shared";

export async function fileExists(body: unknown): Promise<FileExistsResponse> {
  const req = body as { path: string };
  const uri = vscode.Uri.file(req.path);
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return {
      exists: true,
      isDirectory: stat.type === vscode.FileType.Directory,
      path: req.path,
    };
  } catch {
    return { exists: false, isDirectory: false, path: req.path };
  }
}

export async function readFile(body: unknown): Promise<ReadFileResponse> {
  const req = body as ReadFileRequest;
  const uri = vscode.Uri.file(req.path);
  const data = await vscode.workspace.fs.readFile(uri);
  const encoding = req.encoding ?? "utf8";

  return {
    content:
      encoding === "base64"
        ? Buffer.from(data).toString("base64")
        : Buffer.from(data).toString("utf8"),
    encoding,
    path: req.path,
  };
}

export async function writeFile(body: unknown): Promise<{ success: boolean }> {
  const req = body as WriteFileRequest;
  const uri = vscode.Uri.file(req.path);

  if (req.createDirectories) {
    const dir = vscode.Uri.file(
      req.path.substring(0, req.path.lastIndexOf("/")),
    );
    try {
      await vscode.workspace.fs.createDirectory(dir);
    } catch {
      // directory may already exist
    }
  }

  const content =
    req.encoding === "base64"
      ? Buffer.from(req.content, "base64")
      : Buffer.from(req.content, "utf8");

  await vscode.workspace.fs.writeFile(uri, content);
  return { success: true };
}

export async function deleteFile(body: unknown): Promise<{ success: boolean }> {
  const req = body as DeleteFileRequest;
  const uri = vscode.Uri.file(req.path);
  await vscode.workspace.fs.delete(uri, { recursive: req.recursive ?? false, useTrash: req.useTrash ?? true });
  return { success: true };
}

export async function renameFile(body: unknown): Promise<{ success: boolean }> {
  const req = body as RenameFileRequest;
  const oldUri = vscode.Uri.file(req.oldPath);
  const newUri = vscode.Uri.file(req.newPath);
  await vscode.workspace.fs.rename(oldUri, newUri, {
    overwrite: req.overwrite ?? false,
  });
  return { success: true };
}

export async function createDirectory(body: unknown): Promise<{ success: boolean }> {
  const req = body as CreateDirectoryRequest;
  const uri = vscode.Uri.file(req.path);
  await vscode.workspace.fs.createDirectory(uri);
  return { success: true };
}

export async function listDirectory(body: unknown): Promise<ListDirectoryResponse> {
  const req = body as ListDirectoryRequest;
  const uri = vscode.Uri.file(req.path);
  const entries = await vscode.workspace.fs.readDirectory(uri);

  const result = entries.map(([name, type]) => ({
    name,
    path: `${req.path}/${name}`,
    type: (type === vscode.FileType.Directory
      ? "directory"
      : type === vscode.FileType.SymbolicLink
        ? "symlink"
        : "file") as "file" | "directory" | "symlink",
  }));

  return { entries: result };
}
