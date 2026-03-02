import * as vscode from "vscode";

interface QuickAction {
  label: string;
  description: string;
  icon: string;
  command: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: "Open Canvas",
    description: "Visual agent orchestration editor",
    icon: "circuit-board",
    command: "open-agents.openCanvas",
  },
  {
    label: "New Agent",
    description: "Create a new agent on the canvas",
    icon: "add",
    command: "open-agents.newAgent",
  },
  {
    label: "Start Backend",
    description: "Launch Fastify API on port 3001",
    icon: "server",
    command: "open-agents.startBackend",
  },
  {
    label: "Extension Settings",
    description: "API URL, default model, theme",
    icon: "gear",
    command: "open-agents.openSettings",
  },
];

const TIPS: string[] = [
  "Drag presets from the sidebar onto the canvas to add agents",
  "Connect agents by dragging from output handle to input handle",
  "Double-click an agent node to open the chat panel",
  "Use Ctrl+Z / Ctrl+Shift+Z for undo/redo on the canvas",
  "The MCP server lets Claude Code control the canvas — try: 'create a code review agent'",
  "Switch themes via the dropdown in the top-right corner",
  "Export your canvas as JSON with the Export button",
];

class ActionItem extends vscode.TreeItem {
  constructor(action: QuickAction) {
    super(action.label, vscode.TreeItemCollapsibleState.None);
    this.description = action.description;
    this.iconPath = new vscode.ThemeIcon(action.icon);
    this.command = {
      command: action.command,
      title: action.label,
    };
  }
}

class TipItem extends vscode.TreeItem {
  constructor(tip: string) {
    super(tip, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("lightbulb");
    this.tooltip = tip;
  }
}

class SectionItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly children: vscode.TreeItem[],
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon(
      label === "Quick Actions" ? "zap" : "info",
    );
  }
}

export class OpenAgentsSidebarProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private sections: SectionItem[];

  constructor() {
    const actionItems = ACTIONS.map((a) => new ActionItem(a));
    // Pick 3 random tips
    const shuffled = [...TIPS].sort(() => Math.random() - 0.5);
    const tipItems = shuffled.slice(0, 3).map((t) => new TipItem(t));

    this.sections = [
      new SectionItem("Quick Actions", actionItems),
      new SectionItem("Tips", tipItems),
    ];
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      return this.sections;
    }
    if (element instanceof SectionItem) {
      return element.children;
    }
    return [];
  }
}
