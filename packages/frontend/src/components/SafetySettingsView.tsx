import { useEffect, useState, useCallback } from "react";
import type {
  AgentTool,
  PermissionMode,
  GlobalSafetyRules,
  AgentSafetyRules,
} from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

const ALL_TOOLS: AgentTool[] = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
];

const PERMISSION_MODES: { value: PermissionMode; label: string }[] = [
  { value: "read-only", label: "Read-only" },
  { value: "edit", label: "Edit" },
  { value: "full-access", label: "Full access" },
];

export function SafetySettingsView() {
  const fetchSafety = useAppStore((s) => s.fetchSafety);
  const safetyConfig = useAppStore((s) => s.safetyConfig);
  const safetyLoading = useAppStore((s) => s.safetyLoading);
  const updateGlobalSafetyRules = useAppStore((s) => s.updateGlobalSafetyRules);
  const setNodeSafetyRules = useAppStore((s) => s.setNodeSafetyRules);
  const removeNodeSafetyRules = useAppStore((s) => s.removeNodeSafetyRules);
  const testSafetyCommand = useAppStore((s) => s.testSafetyCommand);
  const testResult = useAppStore((s) => s.testResult);
  const nodes = useAppStore((s) => s.nodes);

  // --------------- Global rules local state ---------------
  const [blockedTools, setBlockedTools] = useState<Set<AgentTool>>(new Set());
  const [globalBashBlacklist, setGlobalBashBlacklist] = useState("");
  const [globalFileWhitelist, setGlobalFileWhitelist] = useState("");
  const [defaultPermission, setDefaultPermission] = useState<PermissionMode>("edit");

  // --------------- Per-agent rules local state ---------------
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [allowedTools, setAllowedTools] = useState<Set<AgentTool>>(new Set());
  const [nodeBashBlacklist, setNodeBashBlacklist] = useState("");
  const [nodeFileWhitelist, setNodeFileWhitelist] = useState("");
  const [nodePermission, setNodePermission] = useState<PermissionMode>("edit");

  // --------------- Rule tester local state ---------------
  const [testNodeId, setTestNodeId] = useState<string | null>(null);
  const [testCommand, setTestCommand] = useState("");

  // --------------- Fetch safety config on mount ---------------
  useEffect(() => {
    fetchSafety();
  }, [fetchSafety]);

  // --------------- Sync global state from config ---------------
  useEffect(() => {
    if (!safetyConfig) return;
    const g = safetyConfig.global;
    setBlockedTools(new Set(g.blockedTools));
    setGlobalBashBlacklist(g.bashBlacklist.join("\n"));
    setGlobalFileWhitelist(g.fileWhitelist.join("\n"));
    setDefaultPermission(g.defaultPermissionMode);
  }, [safetyConfig]);

  // --------------- Sync per-agent state when selection changes ---------------
  useEffect(() => {
    if (!selectedNodeId || !safetyConfig) {
      setAllowedTools(new Set());
      setNodeBashBlacklist("");
      setNodeFileWhitelist("");
      setNodePermission("edit");
      return;
    }
    const rules = safetyConfig.perNode[selectedNodeId];
    if (rules) {
      setAllowedTools(new Set(rules.allowedTools));
      setNodeBashBlacklist(rules.bashBlacklist.join("\n"));
      setNodeFileWhitelist(rules.fileWhitelist.join("\n"));
      setNodePermission(rules.permissionMode);
    } else {
      setAllowedTools(new Set(ALL_TOOLS));
      setNodeBashBlacklist("");
      setNodeFileWhitelist("");
      setNodePermission(safetyConfig.global.defaultPermissionMode);
    }
  }, [selectedNodeId, safetyConfig]);

  // --------------- Handlers ---------------
  const toggleBlockedTool = useCallback((tool: AgentTool) => {
    setBlockedTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  }, []);

  const toggleAllowedTool = useCallback((tool: AgentTool) => {
    setAllowedTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  }, []);

  const handleSaveGlobal = useCallback(() => {
    const rules: GlobalSafetyRules = {
      blockedTools: Array.from(blockedTools),
      bashBlacklist: globalBashBlacklist.split("\n").filter((l) => l.trim() !== ""),
      fileWhitelist: globalFileWhitelist.split("\n").filter((l) => l.trim() !== ""),
      defaultPermissionMode: defaultPermission,
    };
    updateGlobalSafetyRules(rules);
  }, [blockedTools, globalBashBlacklist, globalFileWhitelist, defaultPermission, updateGlobalSafetyRules]);

  const handleSaveNode = useCallback(() => {
    if (!selectedNodeId) return;
    const rules: AgentSafetyRules = {
      allowedTools: Array.from(allowedTools),
      bashBlacklist: nodeBashBlacklist.split("\n").filter((l) => l.trim() !== ""),
      fileWhitelist: nodeFileWhitelist.split("\n").filter((l) => l.trim() !== ""),
      permissionMode: nodePermission,
    };
    setNodeSafetyRules(selectedNodeId, rules);
  }, [selectedNodeId, allowedTools, nodeBashBlacklist, nodeFileWhitelist, nodePermission, setNodeSafetyRules]);

  const handleRemoveOverride = useCallback(() => {
    if (!selectedNodeId) return;
    removeNodeSafetyRules(selectedNodeId);
    setSelectedNodeId(null);
  }, [selectedNodeId, removeNodeSafetyRules]);

  const handleTest = useCallback(() => {
    if (!testCommand.trim()) return;
    // Get the tools of the selected test node, or use all tools for global test
    const testNode = testNodeId ? nodes.find((n) => n.id === testNodeId) : null;
    const agentTools = testNode
      ? ((testNode.data as Record<string, unknown>).tools as AgentTool[]) ?? ALL_TOOLS
      : ALL_TOOLS;
    testSafetyCommand(testNodeId ?? "", testCommand, agentTools);
  }, [testNodeId, testCommand, testSafetyCommand, nodes]);

  // --------------- Helper: node label ---------------
  const getNodeLabel = (nodeId: string): string => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return nodeId;
    const data = node.data as Record<string, unknown>;
    return (data.name as string) ?? nodeId;
  };

  // --------------- Loading state ---------------
  if (safetyLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-base">
        <p className="text-text-muted text-sm">Loading safety configuration...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-base p-6">
      <h2 className="text-text-primary text-xl font-semibold">Safety Rules</h2>
      <p className="text-text-secondary text-sm mt-1">
        Configure which tools and commands agents are allowed to use.
      </p>

      <div className="grid grid-cols-2 gap-6 mt-4">
        {/* ====== Left: Global Rules ====== */}
        <section className="bg-surface-raised rounded-lg p-4 border border-border-default">
          <h3 className="text-text-primary text-base font-medium mb-4">Global Rules</h3>

          {/* Blocked Tools */}
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Blocked Tools
            </label>
            <p className="text-text-muted text-xs mb-2">
              Checked tools are blocked globally for all agents.
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_TOOLS.map((tool) => (
                <label key={tool} className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blockedTools.has(tool)}
                    onChange={() => toggleBlockedTool(tool)}
                    className="rounded border-border-default accent-red-500"
                  />
                  {tool}
                </label>
              ))}
            </div>
          </div>

          {/* Bash Blacklist */}
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-medium mb-1">
              Bash Blacklist
            </label>
            <p className="text-text-muted text-xs mb-2">
              Regex patterns for blocked bash commands, one per line.
            </p>
            <textarea
              className="w-full bg-surface-base text-text-primary text-xs font-mono leading-relaxed rounded p-2 resize-y outline-none border border-border-default focus:border-border-focus min-h-[80px]"
              placeholder={"rm -rf /\nsudo .*\ncurl .* | bash"}
              value={globalBashBlacklist}
              onChange={(e) => setGlobalBashBlacklist(e.target.value)}
            />
          </div>

          {/* File Whitelist */}
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-medium mb-1">
              File Whitelist
            </label>
            <p className="text-text-muted text-xs mb-2">
              Glob patterns for allowed file access, one per line. Empty means no restriction.
            </p>
            <textarea
              className="w-full bg-surface-base text-text-primary text-xs font-mono leading-relaxed rounded p-2 resize-y outline-none border border-border-default focus:border-border-focus min-h-[80px]"
              placeholder={"src/**/*\ntests/**/*\n*.md"}
              value={globalFileWhitelist}
              onChange={(e) => setGlobalFileWhitelist(e.target.value)}
            />
          </div>

          {/* Default Permission Mode */}
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Default Permission Mode
            </label>
            <div className="flex gap-4">
              {PERMISSION_MODES.map((mode) => (
                <label key={mode.value} className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="radio"
                    name="global-permission"
                    value={mode.value}
                    checked={defaultPermission === mode.value}
                    onChange={() => setDefaultPermission(mode.value)}
                    className="accent-blue-500"
                  />
                  {mode.label}
                </label>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSaveGlobal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
          >
            Save Global Rules
          </button>
        </section>

        {/* ====== Right: Per-Agent Rules ====== */}
        <section className="bg-surface-raised rounded-lg p-4 border border-border-default">
          <h3 className="text-text-primary text-base font-medium mb-4">Per-Agent Rules</h3>

          {/* Node selector */}
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-medium mb-1">
              Select Agent
            </label>
            <select
              className="w-full bg-surface-base text-text-primary text-sm rounded p-2 outline-none border border-border-default focus:border-border-focus"
              value={selectedNodeId ?? ""}
              onChange={(e) => setSelectedNodeId(e.target.value || null)}
            >
              <option value="">-- Select an agent --</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {getNodeLabel(node.id)}
                </option>
              ))}
            </select>
          </div>

          {selectedNodeId ? (
            <>
              {/* Allowed Tools */}
              <div className="mb-4">
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Allowed Tools
                </label>
                <p className="text-text-muted text-xs mb-2">
                  Checked tools are allowed for this agent.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_TOOLS.map((tool) => (
                    <label key={tool} className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowedTools.has(tool)}
                        onChange={() => toggleAllowedTool(tool)}
                        className="rounded border-border-default accent-green-500"
                      />
                      {tool}
                    </label>
                  ))}
                </div>
              </div>

              {/* Bash Blacklist */}
              <div className="mb-4">
                <label className="block text-text-secondary text-sm font-medium mb-1">
                  Bash Blacklist
                </label>
                <textarea
                  className="w-full bg-surface-base text-text-primary text-xs font-mono leading-relaxed rounded p-2 resize-y outline-none border border-border-default focus:border-border-focus min-h-[80px]"
                  placeholder="Regex patterns, one per line"
                  value={nodeBashBlacklist}
                  onChange={(e) => setNodeBashBlacklist(e.target.value)}
                />
              </div>

              {/* File Whitelist */}
              <div className="mb-4">
                <label className="block text-text-secondary text-sm font-medium mb-1">
                  File Whitelist
                </label>
                <textarea
                  className="w-full bg-surface-base text-text-primary text-xs font-mono leading-relaxed rounded p-2 resize-y outline-none border border-border-default focus:border-border-focus min-h-[80px]"
                  placeholder="Glob patterns, one per line"
                  value={nodeFileWhitelist}
                  onChange={(e) => setNodeFileWhitelist(e.target.value)}
                />
              </div>

              {/* Permission Mode */}
              <div className="mb-4">
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Permission Mode
                </label>
                <div className="flex gap-4">
                  {PERMISSION_MODES.map((mode) => (
                    <label key={mode.value} className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
                      <input
                        type="radio"
                        name="node-permission"
                        value={mode.value}
                        checked={nodePermission === mode.value}
                        onChange={() => setNodePermission(mode.value)}
                        className="accent-blue-500"
                      />
                      {mode.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveNode}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Save Agent Rules
                </button>
                <button
                  type="button"
                  onClick={handleRemoveOverride}
                  className="px-4 py-2 bg-surface-overlay hover:bg-red-600/20 text-red-400 text-sm rounded border border-border-default transition-colors"
                >
                  Remove Override
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-text-muted text-sm">
              Select an agent to configure per-agent rules.
            </div>
          )}
        </section>
      </div>

      {/* ====== Bottom: Rule Tester ====== */}
      <section className="mt-6 bg-surface-raised rounded-lg p-4 border border-border-default">
        <h3 className="text-text-primary text-base font-medium mb-4">Test Rule</h3>
        <p className="text-text-secondary text-sm mb-3">
          Test whether a command would be allowed or blocked by the current safety rules.
        </p>

        <div className="flex gap-3 items-end">
          {/* Node selector */}
          <div className="flex-shrink-0">
            <label className="block text-text-secondary text-xs font-medium mb-1">
              Agent (optional)
            </label>
            <select
              className="bg-surface-base text-text-primary text-sm rounded p-2 outline-none border border-border-default focus:border-border-focus"
              value={testNodeId ?? ""}
              onChange={(e) => setTestNodeId(e.target.value || null)}
            >
              <option value="">Global context</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {getNodeLabel(node.id)}
                </option>
              ))}
            </select>
          </div>

          {/* Command input */}
          <div className="flex-1">
            <label className="block text-text-secondary text-xs font-medium mb-1">
              Command
            </label>
            <input
              type="text"
              className="w-full bg-surface-base text-text-primary text-sm font-mono rounded p-2 outline-none border border-border-default focus:border-border-focus"
              placeholder="e.g. rm -rf /tmp or cat /etc/passwd"
              value={testCommand}
              onChange={(e) => setTestCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTest();
              }}
            />
          </div>

          {/* Test button */}
          <button
            type="button"
            onClick={handleTest}
            disabled={!testCommand.trim()}
            className="px-4 py-2 bg-surface-overlay hover:bg-surface-base text-text-primary text-sm rounded border border-border-default transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Test
          </button>
        </div>

        {/* Result display */}
        {testResult && (
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                testResult.allowed
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {testResult.allowed ? "Allowed" : "Blocked"}
            </span>
            {testResult.reason && (
              <span className="text-text-secondary text-sm">{testResult.reason}</span>
            )}
            {testResult.matchedRule && (
              <span className="text-text-muted text-xs font-mono">
                Rule: {testResult.matchedRule}
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
