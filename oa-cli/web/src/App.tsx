import React, { useCallback, useEffect, useRef, useState } from "react";

// --- Types ---

interface Agent {
  name: string;
  task: string;
  workspace: string;
  tmux_window: string;
  model: string;
  parent: string | null;
  status: string;
  created_at: number;
  finished_at: number | null;
  live_output?: string | null;
  result?: string | null;
}

interface Proposal {
  filename: string;
  content: string;
}

interface ProposalsData {
  summary: string | null;
  proposals: Proposal[];
}

interface ActivityEvent {
  id: number;
  time: number;
  text: string;
  color: string;
}

type TabId = "session" | "output" | "proposals" | "info";

// --- API helpers ---

const API = "/api";

async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API}/agents`);
  return res.json();
}

async function fetchAgentDetail(name: string): Promise<Agent> {
  const res = await fetch(`${API}/agents/${encodeURIComponent(name)}`);
  return res.json();
}

async function spawnAgent(body: {
  task: string;
  name?: string;
  model?: string;
  parent?: string;
}): Promise<Agent> {
  const res = await fetch(`${API}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function killAgent(name: string): Promise<void> {
  await fetch(`${API}/agents/${encodeURIComponent(name)}/kill`, {
    method: "POST",
  });
}

async function cleanAgents(): Promise<{ cleaned: string[] }> {
  const res = await fetch(`${API}/clean`, { method: "POST" });
  return res.json();
}

async function startSession(): Promise<void> {
  await fetch(`${API}/session/start`, { method: "POST" });
}

async function fetchProposals(name: string): Promise<ProposalsData> {
  const res = await fetch(
    `${API}/agents/${encodeURIComponent(name)}/proposals`
  );
  return res.json();
}

async function applyProposal(
  name: string,
  filename: string
): Promise<{ applied: boolean; target: string }> {
  const res = await fetch(
    `${API}/agents/${encodeURIComponent(name)}/proposals/${encodeURIComponent(filename)}/apply`,
    { method: "POST" }
  );
  return res.json();
}

// --- Formatting helpers ---

function formatDuration(start: number, end: number | null): string {
  const elapsed = (end || Date.now() / 1000) - start;
  if (elapsed < 0) return "0s";
  if (elapsed < 60) return `${Math.floor(elapsed)}s`;
  const m = Math.floor(elapsed / 60);
  const s = Math.floor(elapsed % 60);
  if (m < 60) return `${m}m${s.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h${(m % 60).toString().padStart(2, "0")}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusColor(status: string): string {
  switch (status) {
    case "running":
      return "#22d3ee";
    case "done":
      return "#4ade80";
    case "error":
    case "failed":
      return "#f87171";
    case "timeout":
      return "#facc15";
    case "killed":
      return "#9ca3af";
    default:
      return "#9ca3af";
  }
}

function modelColor(model: string): string {
  if (model.includes("opus")) return "#c084fc";
  if (model.includes("sonnet")) return "#60a5fa";
  if (model.includes("haiku")) return "#2dd4bf";
  if (model.startsWith("ollama/") || model.startsWith("ollama")) return "#fb923c";
  if (model === "claude") return "#22d3ee";
  return "#9ca3af";
}

function modelLabel(model: string): string {
  if (model === "claude/opus") return "opus";
  if (model === "claude/sonnet") return "sonnet";
  if (model === "claude/haiku") return "haiku";
  if (model === "claude") return "claude";
  if (model.startsWith("ollama/")) return model.slice(7);
  return model;
}

// --- Hierarchy builder ---

interface TreeNode {
  agent: Agent;
  depth: number;
}

function buildHierarchy(agents: Agent[]): TreeNode[] {
  const byName: Record<string, Agent> = {};
  const childrenOf: Record<string, Agent[]> = {};

  for (const a of agents) {
    byName[a.name] = a;
    if (a.parent) {
      if (!childrenOf[a.parent]) childrenOf[a.parent] = [];
      childrenOf[a.parent].push(a);
    }
  }

  const result: TreeNode[] = [];
  const visited = new Set<string>();

  function addNode(agent: Agent, depth: number) {
    if (visited.has(agent.name)) return;
    visited.add(agent.name);
    result.push({ agent, depth });
    const children = (childrenOf[agent.name] || []).sort(
      (a, b) => a.created_at - b.created_at
    );
    for (const child of children) {
      addNode(child, depth + 1);
    }
  }

  const roots = agents
    .filter((a) => !a.parent || !byName[a.parent])
    .sort((a, b) => a.created_at - b.created_at);

  for (const root of roots) {
    addNode(root, 0);
  }

  for (const a of agents) {
    if (!visited.has(a.name)) {
      addNode(a, 0);
    }
  }

  return result;
}

// --- Global CSS ---

function GlobalStyles() {
  return (
    <style>{`
      @keyframes ccPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      @keyframes ccFadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { margin: 0; overflow: hidden; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #555d6b; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #7a8494; }
      textarea:focus, input:focus, select:focus {
        outline: 1px solid #22d3ee !important;
        border-color: #22d3ee !important;
      }
    `}</style>
  );
}

// --- Main App ---

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("session");
  const [proposals, setProposals] = useState<ProposalsData | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sessionStart] = useState(() => Date.now());
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);

  // Spawn form state
  const [spawnTask, setSpawnTask] = useState("");
  const [spawnModel, setSpawnModel] = useState("claude/sonnet");
  const [spawnName, setSpawnName] = useState("");
  const [spawnParent, setSpawnParent] = useState("");

  const prevAgentsRef = useRef<Record<string, string>>({});
  const eventIdRef = useRef(0);
  const initialLoadRef = useRef(true);
  const termRef = useRef<HTMLPreElement>(null);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll agents
  const refreshAgents = useCallback(async () => {
    try {
      const data = await fetchAgents();
      setAgents(data);

      // Track activity events (skip initial load)
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        const map: Record<string, string> = {};
        for (const a of data) map[a.name] = a.status;
        prevAgentsRef.current = map;
        return;
      }

      const prevMap = prevAgentsRef.current;
      const newEvents: ActivityEvent[] = [];

      for (const a of data) {
        const prev = prevMap[a.name];
        if (prev === undefined) {
          newEvents.push({
            id: ++eventIdRef.current,
            time: Date.now() / 1000,
            text: `${a.name} spawned (${modelLabel(a.model)})`,
            color: "#22d3ee",
          });
        } else if (prev !== a.status) {
          newEvents.push({
            id: ++eventIdRef.current,
            time: Date.now() / 1000,
            text: `${a.name} \u2192 ${a.status}`,
            color: statusColor(a.status),
          });
        }
      }

      // Detect removals (cleaned)
      for (const name of Object.keys(prevMap)) {
        if (!data.find((a) => a.name === name)) {
          newEvents.push({
            id: ++eventIdRef.current,
            time: Date.now() / 1000,
            text: `${name} cleaned`,
            color: "#8b95a5",
          });
        }
      }

      if (newEvents.length > 0) {
        setActivityLog((prev) => [...newEvents, ...prev].slice(0, 50));
      }

      const newMap: Record<string, string> = {};
      for (const a of data) newMap[a.name] = a.status;
      prevAgentsRef.current = newMap;
    } catch {
      // Bridge not running
    }
  }, []);

  useEffect(() => {
    refreshAgents();
    const interval = setInterval(refreshAgents, 2000);
    return () => clearInterval(interval);
  }, [refreshAgents]);

  // Poll detail + proposals for selected agent
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setProposals(null);
      return;
    }

    let active = true;

    const refresh = async () => {
      try {
        const d = await fetchAgentDetail(selected);
        if (!active) return;
        setDetail(d);
      } catch {
        /* ignore */
      }
      try {
        const p = await fetchProposals(selected);
        if (!active) return;
        setProposals(p);
      } catch {
        /* ignore */
      }
    };

    refresh();
    const interval = setInterval(refresh, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selected]);

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [detail?.live_output, detail?.result]);

  // --- Handlers ---

  const handleSpawn = async () => {
    if (!spawnTask.trim()) return;
    await startSession();
    const body: {
      task: string;
      name?: string;
      model?: string;
      parent?: string;
    } = {
      task: spawnTask.trim(),
      model: spawnModel,
    };
    if (spawnName.trim()) body.name = spawnName.trim();
    if (spawnParent) body.parent = spawnParent;
    try {
      const agent = await spawnAgent(body);
      setSelected(agent.name);
      setActiveTab("session");
      setSpawnTask("");
      setSpawnName("");
      setSpawnParent("");
      refreshAgents();
    } catch {
      /* ignore */
    }
  };

  const handleKill = async (name: string) => {
    await killAgent(name);
    refreshAgents();
  };

  const handleClean = async () => {
    await cleanAgents();
    setSelected(null);
    refreshAgents();
  };

  const handleApplyProposal = async (filename: string) => {
    if (!selected) return;
    await applyProposal(selected, filename);
    try {
      const p = await fetchProposals(selected);
      setProposals(p);
    } catch {
      /* ignore */
    }
  };

  // --- Computed ---

  const running = agents.filter((a) => a.status === "running");
  const done = agents.filter((a) => a.status === "done");
  const failed = agents.filter((a) =>
    ["error", "failed", "timeout", "killed"].includes(a.status)
  );
  const hierarchy = buildHierarchy(agents);

  // Model distribution
  const modelDist: { label: string; model: string; count: number }[] = [];
  const modelMap: Record<
    string,
    { label: string; model: string; count: number }
  > = {};
  for (const a of agents) {
    const lbl = modelLabel(a.model);
    if (!modelMap[lbl]) {
      modelMap[lbl] = { label: lbl, model: a.model, count: 0 };
    }
    modelMap[lbl].count++;
  }
  modelDist.push(...Object.values(modelMap));

  const sessionUptime = formatDuration(sessionStart / 1000, null);
  const successRate =
    done.length + failed.length > 0
      ? Math.round(
          (done.length / (done.length + failed.length)) * 100
        )
      : agents.length > 0
        ? 100
        : 0;

  // --- Styles ---

  const S = {
    app: {
      display: "flex",
      flexDirection: "column" as const,
      height: "100vh",
      background: "#0a0a0a",
      color: "#e5e5e5",
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 20px",
      borderBottom: "1px solid #262626",
      background: "#0f0f0f",
      flexShrink: 0,
    },
    main: {
      display: "flex",
      flex: 1,
      overflow: "hidden",
    },
    sectionLabel: {
      padding: "8px 12px",
      borderBottom: "1px solid #1a1a1a",
      fontSize: "10px",
      fontWeight: 700,
      color: "#8b95a5",
      textTransform: "uppercase" as const,
      letterSpacing: "1px",
    },
    mono: {
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    },
  };

  // --- Render ---

  return (
    <div style={S.app}>
      <GlobalStyles />

      {/* ===== HEADER ===== */}
      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              background: "linear-gradient(135deg, #22d3ee, #06b6d4)",
              color: "#0a0a0a",
              fontWeight: 800,
              fontSize: "12px",
              padding: "4px 8px",
              borderRadius: "5px",
              letterSpacing: "1px",
            }}
          >
            OA
          </span>
          <h1
            style={{
              fontSize: "15px",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.3px",
              color: "#f5f5f5",
            }}
          >
            Open Agents Command Centre
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span
            style={{
              ...S.mono,
              fontSize: "13px",
              color: "#8b95a5",
              letterSpacing: "0.5px",
            }}
          >
            {formatTime(new Date(now))}
          </span>
          <span style={{ fontSize: "12px", color: "#7a8494" }}>
            uptime{" "}
            <span style={{ ...S.mono, color: "#9ca3af", fontSize: "12px" }}>
              {sessionUptime}
            </span>
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            {running.length > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: "#164e63",
                  color: "#22d3ee",
                  fontWeight: 600,
                }}
              >
                {running.length} active
              </span>
            )}
            {done.length > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: "#14532d",
                  color: "#4ade80",
                  fontWeight: 600,
                }}
              >
                {done.length} done
              </span>
            )}
            {failed.length > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: "#7f1d1d",
                  color: "#f87171",
                  fontWeight: 600,
                }}
              >
                {failed.length} failed
              </span>
            )}
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "10px",
                background: "#1a1a1a",
                border: "1px solid #444",
                color: "#9ca3af",
                fontWeight: 600,
              }}
            >
              {agents.length} total
            </span>
          </div>
        </div>
      </header>

      {/* ===== MAIN 3-COLUMN LAYOUT ===== */}
      <div style={S.main}>
        {/* ===== LEFT PANEL: Agent Tree + Spawn ===== */}
        <div
          style={{
            width: "300px",
            minWidth: "300px",
            borderRight: "1px solid #262626",
            display: "flex",
            flexDirection: "column",
            background: "#0a0a0a",
          }}
        >
          <div style={S.sectionLabel}>Agents</div>

          {/* Agent Tree */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {hierarchy.length === 0 ? (
              <div
                style={{
                  padding: "40px 16px",
                  textAlign: "center",
                  color: "#7a8494",
                  fontSize: "13px",
                }}
              >
                No agents yet.
                <br />
                Spawn one below.
              </div>
            ) : (
              hierarchy.map(({ agent, depth }) => {
                const isSelected = selected === agent.name;
                const isRunning = agent.status === "running";
                return (
                  <div
                    key={agent.name}
                    onClick={() => setSelected(agent.name)}
                    style={{
                      padding: "8px 10px",
                      paddingLeft: `${10 + depth * 18}px`,
                      cursor: "pointer",
                      borderBottom: "1px solid #1a1a1a",
                      background: isSelected ? "#1e293b" : "transparent",
                      borderLeft: `3px solid ${statusColor(agent.status)}`,
                      transition: "background 0.15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {depth > 0 && (
                        <span
                          style={{
                            ...S.mono,
                            color: "#555d6b",
                            fontSize: "10px",
                            flexShrink: 0,
                          }}
                        >
                          {"\u2514"}
                        </span>
                      )}
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: statusColor(agent.status),
                          display: "inline-block",
                          flexShrink: 0,
                          animation: isRunning
                            ? "ccPulse 2s infinite"
                            : "none",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {agent.name}
                      </span>
                      <span
                        style={{
                          ...S.mono,
                          fontSize: "9px",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          border: `1px solid ${modelColor(agent.model)}`,
                          color: modelColor(agent.model),
                          flexShrink: 0,
                        }}
                      >
                        {modelLabel(agent.model)}
                      </span>
                      <span
                        style={{
                          ...S.mono,
                          fontSize: "10px",
                          color: "#7a8494",
                          flexShrink: 0,
                        }}
                      >
                        {formatDuration(agent.created_at, agent.finished_at)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#7a8494",
                        marginTop: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingLeft: depth > 0 ? "18px" : "0",
                      }}
                    >
                      {agent.task.length > 45
                        ? agent.task.slice(0, 45) + "\u2026"
                        : agent.task}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Spawn Form */}
          <div
            style={{
              borderTop: "1px solid #262626",
              padding: "10px",
              background: "#0f0f0f",
            }}
          >
            <div style={{ ...S.sectionLabel, padding: "0 0 6px 0", borderBottom: "none" }}>
              Spawn Agent
            </div>
            <select
              value={spawnModel}
              onChange={(e) => setSpawnModel(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                background: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#e5e5e5",
                fontSize: "12px",
                ...S.mono,
                marginBottom: "6px",
              }}
            >
              <option value="claude/opus">claude/opus</option>
              <option value="claude/sonnet">claude/sonnet</option>
              <option value="claude/haiku">claude/haiku</option>
              <optgroup label="Ollama">
                <option value="ollama/qwen3:4b">qwen3:4b</option>
                <option value="ollama/phi4-mini">phi4-mini</option>
                <option value="ollama/qwen2.5-coder:7b">qwen2.5-coder:7b</option>
                <option value="ollama/qwen3:8b">qwen3:8b</option>
                <option value="ollama/llama3.2:3b">llama3.2:3b</option>
              </optgroup>
            </select>
            <textarea
              value={spawnTask}
              onChange={(e) => setSpawnTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSpawn();
                }
              }}
              placeholder="Describe the task..."
              rows={3}
              style={{
                width: "100%",
                padding: "6px 8px",
                background: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#e5e5e5",
                fontSize: "12px",
                resize: "vertical",
                fontFamily: "inherit",
                marginBottom: "6px",
                lineHeight: "1.4",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: "4px",
                marginBottom: "6px",
              }}
            >
              <input
                value={spawnName}
                onChange={(e) => setSpawnName(e.target.value)}
                placeholder="Name (optional)"
                style={{
                  flex: 1,
                  padding: "5px 8px",
                  background: "#1a1a1a",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  color: "#e5e5e5",
                  fontSize: "11px",
                }}
              />
              <select
                value={spawnParent}
                onChange={(e) => setSpawnParent(e.target.value)}
                style={{
                  flex: 1,
                  padding: "5px 8px",
                  background: "#1a1a1a",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  color: "#e5e5e5",
                  fontSize: "11px",
                }}
              >
                <option value="">No parent</option>
                {running.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={handleSpawn}
                disabled={!spawnTask.trim()}
                style={{
                  flex: 1,
                  padding: "7px",
                  background: spawnTask.trim() ? "#22d3ee" : "#1a1a1a",
                  color: spawnTask.trim() ? "#0a0a0a" : "#7a8494",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: spawnTask.trim() ? "pointer" : "default",
                  transition: "all 0.15s",
                }}
              >
                Spawn
              </button>
              <button
                onClick={handleClean}
                style={{
                  padding: "7px 12px",
                  background: "#1a1a1a",
                  color: "#9ca3af",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Clean
              </button>
            </div>
          </div>
        </div>

        {/* ===== MIDDLE PANEL: Detail with Tabs ===== */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {!selected || !detail ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#555d6b",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "48px", opacity: 0.5 }}>&#9678;</span>
              <span style={{ fontSize: "14px", color: "#7a8494" }}>
                Select an agent to view details
              </span>
            </div>
          ) : (
            <>
              {/* Agent detail header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: "1px solid #262626",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 700 }}>
                    {detail.name}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: statusColor(detail.status),
                      color: "#0a0a0a",
                      fontWeight: 700,
                    }}
                  >
                    {detail.status}
                  </span>
                  <span
                    style={{
                      ...S.mono,
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "3px",
                      border: `1px solid ${modelColor(detail.model)}`,
                      color: modelColor(detail.model),
                    }}
                  >
                    {modelLabel(detail.model)}
                  </span>
                  <span
                    style={{
                      ...S.mono,
                      fontSize: "12px",
                      color: "#8b95a5",
                    }}
                  >
                    {formatDuration(detail.created_at, detail.finished_at)}
                  </span>
                </div>
                {detail.status === "running" && (
                  <button
                    onClick={() => handleKill(detail.name)}
                    style={{
                      padding: "4px 12px",
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Kill
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid #262626",
                  background: "#0f0f0f",
                  flexShrink: 0,
                }}
              >
                {(
                  [
                    "session",
                    "output",
                    "proposals",
                    "info",
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "8px 16px",
                      background: "transparent",
                      color:
                        activeTab === tab ? "#22d3ee" : "#8b95a5",
                      border: "none",
                      borderBottom:
                        activeTab === tab
                          ? "2px solid #22d3ee"
                          : "2px solid transparent",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      transition: "color 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {tab}
                    {tab === "proposals" &&
                      proposals &&
                      proposals.proposals.length > 0 && (
                        <span
                          style={{
                            fontSize: "10px",
                            background: "#164e63",
                            padding: "1px 5px",
                            borderRadius: "8px",
                            color: "#22d3ee",
                          }}
                        >
                          {proposals.proposals.length}
                        </span>
                      )}
                    {tab === "session" &&
                      detail.status === "running" && (
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#4ade80",
                            display: "inline-block",
                            animation: "ccPulse 2s infinite",
                          }}
                        />
                      )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
                {/* Session tab */}
                {activeTab === "session" && (
                  <pre
                    ref={termRef}
                    style={{
                      position: "absolute",
                      inset: "12px",
                      padding: "12px",
                      background: "#111",
                      border: "1px solid #262626",
                      borderRadius: "6px",
                      ...S.mono,
                      fontSize: "12px",
                      lineHeight: "1.6",
                      color: "#d4d4d4",
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {detail.live_output ||
                      detail.result ||
                      "Waiting for output..."}
                  </pre>
                )}

                {/* Output tab */}
                {activeTab === "output" && (
                  <div style={{ padding: "16px" }}>
                    {detail.result ? (
                      <pre
                        style={{
                          ...S.mono,
                          fontSize: "12px",
                          lineHeight: "1.6",
                          color: "#d4d4d4",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          background: "#111",
                          padding: "12px",
                          borderRadius: "6px",
                          border: "1px solid #262626",
                        }}
                      >
                        {detail.result}
                      </pre>
                    ) : (
                      <div
                        style={{
                          color: "#7a8494",
                          textAlign: "center",
                          padding: "40px",
                          fontSize: "13px",
                        }}
                      >
                        {detail.status === "running"
                          ? "Agent is still running\u2026"
                          : "No output available"}
                      </div>
                    )}
                  </div>
                )}

                {/* Proposals tab */}
                {activeTab === "proposals" && (
                  <div style={{ padding: "12px" }}>
                    {proposals && proposals.summary && (
                      <div
                        style={{
                          marginBottom: "12px",
                          padding: "10px",
                          background: "#111",
                          borderRadius: "6px",
                          border: "1px solid #262626",
                          fontSize: "12px",
                          lineHeight: "1.5",
                          color: "#9ca3af",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#22d3ee",
                            marginBottom: "4px",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Summary
                        </div>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            ...S.mono,
                            fontSize: "11px",
                            margin: 0,
                          }}
                        >
                          {proposals.summary}
                        </pre>
                      </div>
                    )}
                    {proposals &&
                    proposals.proposals.length > 0 ? (
                      proposals.proposals.map((p) => (
                        <div
                          key={p.filename}
                          style={{
                            marginBottom: "8px",
                            background: "#111",
                            borderRadius: "6px",
                            border: "1px solid #262626",
                            overflow: "hidden",
                            animation: "ccFadeIn 0.2s ease-out",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              borderBottom: "1px solid #1a1a1a",
                              background: "#0f0f0f",
                            }}
                          >
                            <span
                              style={{
                                ...S.mono,
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#e5e5e5",
                              }}
                            >
                              {p.filename}
                            </span>
                            <button
                              onClick={() =>
                                handleApplyProposal(p.filename)
                              }
                              style={{
                                padding: "3px 10px",
                                background: "#166534",
                                color: "#4ade80",
                                border: "1px solid rgba(34,197,94,0.25)",
                                borderRadius: "3px",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Apply
                            </button>
                          </div>
                          <pre
                            style={{
                              padding: "8px 12px",
                              ...S.mono,
                              fontSize: "11px",
                              color: "#8b95a5",
                              whiteSpace: "pre-wrap",
                              maxHeight: "200px",
                              overflow: "auto",
                              lineHeight: "1.5",
                              margin: 0,
                            }}
                          >
                            {p.content.length > 600
                              ? p.content.slice(0, 600) + "\n\u2026"
                              : p.content}
                          </pre>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          color: "#7a8494",
                          textAlign: "center",
                          padding: "40px",
                          fontSize: "13px",
                        }}
                      >
                        No proposals available
                      </div>
                    )}
                  </div>
                )}

                {/* Info tab */}
                {activeTab === "info" && (
                  <div style={{ padding: "16px" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "13px",
                      }}
                    >
                      <tbody>
                        {(
                          [
                            ["Name", detail.name],
                            ["Status", detail.status],
                            ["Model", detail.model],
                            ["Task", detail.task],
                            ["Workspace", detail.workspace],
                            ["Tmux Window", detail.tmux_window],
                            [
                              "Parent",
                              detail.parent || "\u2014",
                            ],
                            [
                              "Created",
                              formatTimestamp(detail.created_at),
                            ],
                            [
                              "Finished",
                              detail.finished_at
                                ? formatTimestamp(
                                    detail.finished_at
                                  )
                                : "\u2014",
                            ],
                            [
                              "Duration",
                              formatDuration(
                                detail.created_at,
                                detail.finished_at
                              ),
                            ],
                          ] as [string, string][]
                        ).map(([label, value]) => (
                          <tr key={label}>
                            <td
                              style={{
                                padding: "6px 12px 6px 0",
                                color: "#7a8494",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                verticalAlign: "top",
                                width: "120px",
                              }}
                            >
                              {label}
                            </td>
                            <td
                              style={{
                                padding: "6px 0",
                                ...(label !== "Task"
                                  ? S.mono
                                  : {}),
                                fontSize: "12px",
                                wordBreak: "break-all",
                                color: "#e5e5e5",
                              }}
                            >
                              {value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Children list */}
                    {agents.filter((a) => a.parent === detail.name)
                      .length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#7a8494",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            marginBottom: "6px",
                          }}
                        >
                          Child Agents
                        </div>
                        {agents
                          .filter(
                            (a) => a.parent === detail.name
                          )
                          .map((child) => (
                            <div
                              key={child.name}
                              onClick={() =>
                                setSelected(child.name)
                              }
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                borderRadius: "3px",
                                transition:
                                  "background 0.15s",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: statusColor(
                                    child.status
                                  ),
                                  display: "inline-block",
                                }}
                              />
                              <span
                                style={{
                                  ...S.mono,
                                  color: "#22d3ee",
                                }}
                              >
                                {child.name}
                              </span>
                              <span
                                style={{
                                  color: "#7a8494",
                                  fontSize: "11px",
                                }}
                              >
                                {child.status}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ===== RIGHT PANEL: System Dashboard ===== */}
        <div
          style={{
            width: "280px",
            minWidth: "280px",
            borderLeft: "1px solid #262626",
            display: "flex",
            flexDirection: "column",
            background: "#0a0a0a",
            overflowY: "auto",
          }}
        >
          {/* Active Agents */}
          <div
            style={{
              padding: "14px 12px",
              borderBottom: "1px solid #262626",
            }}
          >
            <div style={S.sectionLabel}>Active Agents</div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
                marginTop: "4px",
              }}
            >
              <span
                style={{
                  ...S.mono,
                  fontSize: "32px",
                  fontWeight: 800,
                  color:
                    running.length > 0 ? "#22d3ee" : "#555d6b",
                  animation:
                    running.length > 0
                      ? "ccPulse 2s infinite"
                      : "none",
                  lineHeight: 1,
                }}
              >
                {running.length}
              </span>
              <span style={{ fontSize: "12px", color: "#7a8494" }}>
                running
              </span>
            </div>
          </div>

          {/* Model Distribution */}
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid #262626",
            }}
          >
            <div style={S.sectionLabel}>Models</div>
            <div style={{ marginTop: "6px" }}>
              {modelDist.length > 0 ? (
                modelDist.map((m) => (
                  <div
                    key={m.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "3px 0",
                      fontSize: "12px",
                    }}
                  >
                    <span
                      style={{
                        ...S.mono,
                        color: modelColor(m.model),
                      }}
                    >
                      {m.label}
                    </span>
                    <span
                      style={{
                        ...S.mono,
                        fontWeight: 600,
                        color: "#e5e5e5",
                      }}
                    >
                      {m.count}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    color: "#555d6b",
                    fontSize: "12px",
                    ...S.mono,
                  }}
                >
                  {"\u2014"}
                </div>
              )}
            </div>
          </div>

          {/* Resource Tracker */}
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid #262626",
            }}
          >
            <div style={S.sectionLabel}>Resources</div>
            <div style={{ marginTop: "6px" }}>
              {(
                [
                  ["Session Uptime", sessionUptime],
                  ["Total Spawned", `${agents.length}`],
                  ["Completed", `${done.length}`],
                  ["Failed", `${failed.length}`],
                  [
                    "Success Rate",
                    `${successRate}%`,
                  ],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ color: "#8b95a5" }}>
                    {label}
                  </span>
                  <span
                    style={{
                      ...S.mono,
                      fontWeight: 600,
                      color: "#e5e5e5",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div style={{ padding: "12px", flex: 1 }}>
            <div style={S.sectionLabel}>Activity</div>
            <div style={{ marginTop: "6px" }}>
              {activityLog.length > 0 ? (
                activityLog.slice(0, 25).map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: "3px 0",
                      fontSize: "11px",
                      borderBottom: "1px solid #1a1a1a",
                      animation: "ccFadeIn 0.3s ease-out",
                    }}
                  >
                    <span
                      style={{
                        ...S.mono,
                        color: "#555d6b",
                        marginRight: "6px",
                        fontSize: "10px",
                      }}
                    >
                      {formatTimestamp(evt.time)}
                    </span>
                    <span style={{ color: evt.color }}>
                      {evt.text}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    color: "#555d6b",
                    fontSize: "11px",
                    padding: "8px 0",
                  }}
                >
                  No activity yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
