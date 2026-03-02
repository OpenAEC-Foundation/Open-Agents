import React, { useCallback, useEffect, useRef, useState } from "react";

// --- Types ---

interface Agent {
  name: string;
  task: string;
  workspace: string;
  tmux_window: string;
  status: string;
  created_at: number;
  finished_at: number | null;
  live_output?: string | null;
  result?: string | null;
}

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

async function fetchAgentOutput(
  name: string,
  lines = 80
): Promise<{ output: string | null; status: string }> {
  const res = await fetch(
    `${API}/agents/${encodeURIComponent(name)}/output?lines=${lines}`
  );
  return res.json();
}

async function spawnAgent(task: string, name?: string): Promise<Agent> {
  const res = await fetch(`${API}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, name: name || undefined }),
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

// --- Formatting ---

function formatDuration(start: number, end: number | null): string {
  const elapsed = (end || Date.now() / 1000) - start;
  if (elapsed < 60) return `${Math.floor(elapsed)}s`;
  const m = Math.floor(elapsed / 60);
  const s = Math.floor(elapsed % 60);
  if (m < 60) return `${m}m${s.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h${(m % 60).toString().padStart(2, "0")}m`;
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

// --- Components ---

function Header({
  agents,
  onStartSession,
}: {
  agents: Agent[];
  onStartSession: () => void;
}) {
  const running = agents.filter((a) => a.status === "running").length;
  const done = agents.filter((a) => a.status === "done").length;
  const other = agents.length - running - done;

  return (
    <header style={styles.header}>
      <div style={styles.headerLeft}>
        <span style={styles.logo}>OA</span>
        <h1 style={styles.title}>Open Agents</h1>
      </div>
      <div style={styles.headerStats}>
        {running > 0 && (
          <span style={{ ...styles.badge, background: "#164e63" }}>
            {running} active
          </span>
        )}
        {done > 0 && (
          <span style={{ ...styles.badge, background: "#14532d" }}>
            {done} done
          </span>
        )}
        {other > 0 && (
          <span style={{ ...styles.badge, background: "#374151" }}>
            {other} other
          </span>
        )}
      </div>
      <button onClick={onStartSession} style={styles.btnSmall}>
        Start Session
      </button>
    </header>
  );
}

function AgentList({
  agents,
  selected,
  onSelect,
}: {
  agents: Agent[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  if (agents.length === 0) {
    return (
      <div style={styles.emptyState}>
        No agents. Spawn one using the form below.
      </div>
    );
  }

  return (
    <div style={styles.agentList}>
      {agents
        .sort((a, b) => a.created_at - b.created_at)
        .map((agent) => (
          <div
            key={agent.name}
            onClick={() => onSelect(agent.name)}
            style={{
              ...styles.agentRow,
              borderLeft: `3px solid ${statusColor(agent.status)}`,
              background:
                selected === agent.name ? "#1e293b" : "transparent",
            }}
          >
            <div style={styles.agentRowTop}>
              <span style={styles.agentName}>{agent.name}</span>
              <span
                style={{
                  ...styles.statusDot,
                  background: statusColor(agent.status),
                }}
              />
              <span style={styles.agentStatus}>{agent.status}</span>
              <span style={styles.agentDuration}>
                {formatDuration(agent.created_at, agent.finished_at)}
              </span>
            </div>
            <div style={styles.agentTask}>
              {agent.task.length > 80
                ? agent.task.slice(0, 80) + "..."
                : agent.task}
            </div>
          </div>
        ))}
    </div>
  );
}

function SessionView({
  agent,
  output,
  onKill,
}: {
  agent: Agent | null;
  output: string | null;
  onKill: (name: string) => void;
}) {
  const termRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [output]);

  if (!agent) {
    return (
      <div style={styles.sessionEmpty}>
        Select an agent to view its live session
      </div>
    );
  }

  return (
    <div style={styles.sessionView}>
      <div style={styles.sessionHeader}>
        <div>
          <span style={styles.sessionName}>{agent.name}</span>
          <span
            style={{
              ...styles.statusBadge,
              background: statusColor(agent.status),
            }}
          >
            {agent.status}
          </span>
        </div>
        {agent.status === "running" && (
          <button
            onClick={() => onKill(agent.name)}
            style={styles.btnDanger}
          >
            Kill
          </button>
        )}
      </div>
      <div style={styles.sessionMeta}>
        <div>
          <strong>Task:</strong> {agent.task}
        </div>
        <div>
          <strong>Workspace:</strong>{" "}
          <code style={styles.code}>{agent.workspace}</code>
        </div>
        <div>
          <strong>Duration:</strong>{" "}
          {formatDuration(agent.created_at, agent.finished_at)}
        </div>
      </div>
      <div style={styles.terminalLabel}>
        {agent.status === "running" ? "Live Session" : "Output"}
        {agent.status === "running" && (
          <span style={styles.liveDot} />
        )}
      </div>
      <pre ref={termRef} style={styles.terminal}>
        {output || "Waiting for output..."}
      </pre>
    </div>
  );
}

function SpawnForm({ onSpawn }: { onSpawn: (task: string) => void }) {
  const [task, setTask] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim()) {
      onSpawn(task.trim());
      setTask("");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.spawnForm}>
      <input
        type="text"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Describe a task for a new agent..."
        style={styles.input}
      />
      <button type="submit" style={styles.btnPrimary} disabled={!task.trim()}>
        Spawn Agent
      </button>
    </form>
  );
}

// --- Main App ---

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [output, setOutput] = useState<string | null>(null);

  // Refresh agent list every 2s
  const refreshAgents = useCallback(async () => {
    try {
      const data = await fetchAgents();
      setAgents(data);
    } catch {
      // Bridge not running
    }
  }, []);

  useEffect(() => {
    refreshAgents();
    const interval = setInterval(refreshAgents, 2000);
    return () => clearInterval(interval);
  }, [refreshAgents]);

  // Refresh selected agent output every 1.5s
  useEffect(() => {
    if (!selected) {
      setSelectedAgent(null);
      setOutput(null);
      return;
    }

    let active = true;

    const refresh = async () => {
      try {
        const detail = await fetchAgentDetail(selected);
        if (!active) return;
        setSelectedAgent(detail);
        setOutput(detail.live_output || detail.result || null);
      } catch {
        // ignore
      }
    };

    refresh();
    const interval = setInterval(refresh, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selected]);

  const handleSpawn = async (task: string) => {
    await startSession();
    const agent = await spawnAgent(task);
    setSelected(agent.name);
    refreshAgents();
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

  return (
    <div style={styles.app}>
      <Header
        agents={agents}
        onStartSession={async () => {
          await startSession();
          refreshAgents();
        }}
      />
      <div style={styles.main}>
        <div style={styles.leftPanel}>
          <AgentList
            agents={agents}
            selected={selected}
            onSelect={setSelected}
          />
          <div style={styles.bottomBar}>
            <SpawnForm onSpawn={handleSpawn} />
            <button onClick={handleClean} style={styles.btnSmall}>
              Clean Finished
            </button>
          </div>
        </div>
        <div style={styles.rightPanel}>
          <SessionView
            agent={selectedAgent}
            output={output}
            onKill={handleKill}
          />
        </div>
      </div>
    </div>
  );
}

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: "flex",
    flexDirection: "column",
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
    padding: "12px 20px",
    borderBottom: "1px solid #262626",
    background: "#0f0f0f",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logo: {
    background: "#22d3ee",
    color: "#0a0a0a",
    fontWeight: 800,
    fontSize: "14px",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    margin: 0,
  },
  headerStats: {
    display: "flex",
    gap: "8px",
  },
  badge: {
    fontSize: "12px",
    padding: "3px 10px",
    borderRadius: "12px",
    color: "#e5e5e5",
  },
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  leftPanel: {
    width: "380px",
    borderRight: "1px solid #262626",
    display: "flex",
    flexDirection: "column",
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  agentList: {
    flex: 1,
    overflowY: "auto",
  },
  agentRow: {
    padding: "12px 16px",
    cursor: "pointer",
    borderBottom: "1px solid #1a1a1a",
    transition: "background 0.15s",
  },
  agentRowTop: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  agentName: {
    fontWeight: 600,
    fontSize: "14px",
    flex: 1,
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
  },
  agentStatus: {
    fontSize: "12px",
    color: "#9ca3af",
  },
  agentDuration: {
    fontSize: "12px",
    color: "#6b7280",
    fontFamily: "'JetBrains Mono', monospace",
  },
  agentTask: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "4px",
    lineHeight: "1.4",
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center" as const,
    color: "#6b7280",
  },
  bottomBar: {
    padding: "12px 16px",
    borderTop: "1px solid #262626",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  spawnForm: {
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "6px",
    color: "#e5e5e5",
    fontSize: "13px",
    outline: "none",
  },
  btnPrimary: {
    padding: "8px 16px",
    background: "#22d3ee",
    color: "#0a0a0a",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  btnDanger: {
    padding: "6px 14px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
  btnSmall: {
    padding: "6px 12px",
    background: "#262626",
    color: "#e5e5e5",
    border: "1px solid #333",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
  },
  sessionEmpty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#6b7280",
    fontSize: "15px",
  },
  sessionView: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  sessionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderBottom: "1px solid #262626",
  },
  sessionName: {
    fontSize: "16px",
    fontWeight: 700,
    marginRight: "10px",
  },
  statusBadge: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "10px",
    color: "#0a0a0a",
    fontWeight: 600,
  },
  sessionMeta: {
    padding: "12px 20px",
    fontSize: "13px",
    borderBottom: "1px solid #262626",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#9ca3af",
  },
  code: {
    background: "#1a1a1a",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  terminalLabel: {
    padding: "8px 20px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  liveDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#4ade80",
    display: "inline-block",
    animation: "pulse 2s infinite",
  },
  terminal: {
    flex: 1,
    margin: "0 20px 20px",
    padding: "16px",
    background: "#111111",
    border: "1px solid #262626",
    borderRadius: "8px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#d4d4d4",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};
