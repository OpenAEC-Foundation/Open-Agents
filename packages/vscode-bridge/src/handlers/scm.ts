import * as vscode from "vscode";
import type { ScmStateResponse } from "../shared";

export async function getScmState(): Promise<ScmStateResponse> {
  // VS Code SCM API provides scm.inputBox and scm providers
  // The Git extension exposes its API which we can access
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension?.isActive) {
    return {
      changes: [],
      stagedChanges: [],
      mergeChanges: [],
      repositoryCount: 0,
    };
  }

  const git = gitExtension.exports.getAPI(1);
  const repos = git.repositories;

  if (repos.length === 0) {
    return {
      changes: [],
      stagedChanges: [],
      mergeChanges: [],
      repositoryCount: 0,
    };
  }

  // Use the first repository
  const repo = repos[0];
  const mapChanges = (changes: Array<{ uri: vscode.Uri; status: number }>) =>
    changes.map((c) => ({
      uri: c.uri.fsPath,
      status: mapGitStatus(c.status),
    }));

  return {
    changes: mapChanges(repo.state.workingTreeChanges),
    stagedChanges: mapChanges(repo.state.indexChanges),
    mergeChanges: mapChanges(repo.state.mergeChanges),
    repositoryCount: repos.length,
  };
}

function mapGitStatus(status: number): ScmStateResponse["changes"][number]["status"] {
  // Git status enum values from the Git extension API
  const statusMap: Record<number, ScmStateResponse["changes"][number]["status"]> = {
    0: "modified",
    1: "index_modified",
    2: "added",
    3: "index_added",
    4: "deleted",
    5: "index_deleted",
    6: "index_renamed",
    7: "untracked",
    8: "ignored",
    9: "conflicting",
  };
  return statusMap[status] ?? "modified";
}
