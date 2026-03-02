import * as vscode from "vscode";
import type { ListTasksResponse, RunTaskRequest } from "../shared";

export async function listTasks(): Promise<ListTasksResponse> {
  const tasks = await vscode.tasks.fetchTasks();
  return {
    tasks: tasks.map((t) => ({
      type: t.definition.type,
      label: t.name,
      group: t.group?.id,
    })),
  };
}

export async function runTask(body: unknown): Promise<{ success: boolean }> {
  const req = body as RunTaskRequest;
  const tasks = await vscode.tasks.fetchTasks();
  const task = tasks.find((t) => t.name === req.label);

  if (!task) {
    throw new Error(`Task "${req.label}" not found`);
  }

  await vscode.tasks.executeTask(task);
  return { success: true };
}
