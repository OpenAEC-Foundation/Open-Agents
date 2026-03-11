import { useEffect, useRef, useState } from 'react';
import { authHeaders } from '../../api/client';

type TaskStatus = 'todo' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  created_at?: number;
}

interface Team {
  name: string;
  members: string[];
}

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

const STATUS_MOVES: Record<TaskStatus, { prev?: TaskStatus; next?: TaskStatus }> = {
  todo: { next: 'in_progress' },
  in_progress: { prev: 'todo', next: 'done' },
  done: { prev: 'in_progress' },
};

const STATUS_BADGE: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'To Do', color: '#4a5568' },
  in_progress: { label: 'In Progress', color: '#d97706' },
  done: { label: 'Done', color: '#2d6a4f' },
};

export default function TaskBoard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New task form
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load teams once
  useEffect(() => {
    async function loadTeams() {
      try {
        const res = await fetch('/api/teams');
        const data = await res.json();
        const list: Team[] = Array.isArray(data) ? (data as Team[]) : [];
        setTeams(list);
        if (list.length > 0) setSelectedTeam(list[0].name);
      } catch {
        setError('Failed to load teams');
      } finally {
        setLoadingTeams(false);
      }
    }
    loadTeams();
  }, []);

  // Poll tasks for selected team
  useEffect(() => {
    if (!selectedTeam) return;

    async function loadTasks() {
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(selectedTeam)}`);
        const data = await res.json();
        setTasks(Array.isArray(data) ? (data as Task[]) : []);
        setError(null);
      } catch {
        setError('Failed to load tasks');
      }
    }

    loadTasks();
    pollRef.current = setInterval(loadTasks, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedTeam]);

  async function handleMoveTask(task: Task, direction: 'prev' | 'next') {
    const newStatus = STATUS_MOVES[task.status][direction];
    if (!newStatus) return;
    try {
      await fetch(`/api/tasks/${encodeURIComponent(selectedTeam)}/${encodeURIComponent(task.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch {
      setError('Failed to update task');
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !selectedTeam) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(selectedTeam)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() }),
      });
      const created = (await res.json()) as Task;
      setTasks((prev) => [...prev, created]);
      setNewTitle('');
      setNewDesc('');
      setShowNewTask(false);
    } catch {
      setError('Failed to create task');
    } finally {
      setCreating(false);
    }
  }

  if (loadingTeams) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#8899aa' }}>
        Loading…
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#8899aa', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>No teams found</span>
        <span style={{ fontSize: '12px', opacity: 0.7 }}>Create a team first using the Teams tab above</span>
      </div>
    );
  }

  const tasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 16px', borderBottom: '1px solid #1e2d3d',
        background: '#0d1b2a', flexShrink: 0,
      }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#5a7a99', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Task Board
        </span>

        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          style={{
            padding: '4px 8px', background: '#0f1923', border: '1px solid #1e2d3d',
            borderRadius: '4px', color: '#c8d8e8', fontSize: '12px', cursor: 'pointer',
          }}
        >
          {teams.map((t) => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {error && (
          <span style={{ fontSize: '11px', color: '#f87171' }}>{error}</span>
        )}

        <button
          onClick={() => setShowNewTask((v) => !v)}
          style={{
            padding: '5px 14px', background: '#d97706', border: 'none',
            borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + New Task
        </button>
      </div>

      {/* New task form */}
      {showNewTask && (
        <form
          onSubmit={handleCreateTask}
          style={{
            display: 'flex', gap: '8px', alignItems: 'flex-start',
            padding: '10px 16px', background: '#0d1b2a', borderBottom: '1px solid #1e2d3d',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            placeholder="Task title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            style={{
              padding: '5px 8px', background: '#0f1923', border: '1px solid #1e2d3d',
              borderRadius: '4px', color: '#c8d8e8', fontSize: '12px', width: '180px',
            }}
          />
          <textarea
            placeholder="Description (optional)…"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={1}
            style={{
              padding: '5px 8px', background: '#0f1923', border: '1px solid #1e2d3d',
              borderRadius: '4px', color: '#c8d8e8', fontSize: '12px', flex: 1, resize: 'vertical',
            }}
          />
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            style={{
              padding: '5px 14px', background: '#d97706', border: 'none',
              borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => { setShowNewTask(false); setNewTitle(''); setNewDesc(''); }}
            style={{
              padding: '5px 10px', background: 'transparent', border: '1px solid #1e2d3d',
              borderRadius: '4px', color: '#8899aa', fontSize: '12px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </form>
      )}

      {/* Kanban columns */}
      <div style={{
        display: 'flex', gap: '12px', flex: 1, overflow: 'auto',
        padding: '16px',
      }}>
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            style={{
              flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column',
              background: '#0f1923', borderRadius: '8px', border: '1px solid #1e2d3d',
              overflow: 'hidden',
            }}
          >
            {/* Column header */}
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid #1e2d3d',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{
                fontSize: '10px', fontWeight: 700, color: '#5a7a99',
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {col.label}
              </span>
              <span style={{
                fontSize: '10px', background: '#1a2942', color: '#8899aa',
                borderRadius: '10px', padding: '1px 7px', fontWeight: 600,
              }}>
                {tasksByStatus(col.key).length}
              </span>
            </div>

            {/* Task cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasksByStatus(col.key).length === 0 && (
                <div style={{ fontSize: '11px', color: '#3a5066', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                  No tasks
                </div>
              )}
              {tasksByStatus(col.key).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMove={handleMoveTask}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onMove }: { task: Task; onMove: (task: Task, dir: 'prev' | 'next') => void }) {
  const badge = STATUS_BADGE[task.status];
  const moves = STATUS_MOVES[task.status];

  return (
    <div style={{
      background: '#1e2d3d',
      borderRadius: '6px',
      padding: '10px 12px',
      borderLeft: task.status === 'in_progress' ? '3px solid #d97706' : '3px solid transparent',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      {/* Title + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#c8d8e8', lineHeight: 1.4 }}>
          {task.title}
        </span>
        <span style={{
          fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
          background: badge.color + '33', color: badge.color === '#4a5568' ? '#8899aa' : badge.color,
          border: `1px solid ${badge.color}55`, whiteSpace: 'nowrap', fontWeight: 600,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p style={{
          fontSize: '11px', color: '#6a8899', margin: 0,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          lineHeight: 1.5,
        }}>
          {task.description}
        </p>
      )}

      {/* Move buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
        {moves.prev && (
          <button
            onClick={() => onMove(task, 'prev')}
            style={{
              padding: '2px 8px', background: 'transparent', border: '1px solid #2a3d54',
              borderRadius: '4px', color: '#7a99bb', fontSize: '10px', cursor: 'pointer',
            }}
          >
            ← {COLUMNS.find((c) => c.key === moves.prev)?.label}
          </button>
        )}
        {moves.next && (
          <button
            onClick={() => onMove(task, 'next')}
            style={{
              padding: '2px 8px', background: 'transparent', border: '1px solid #2a3d54',
              borderRadius: '4px', color: '#7a99bb', fontSize: '10px', cursor: 'pointer',
            }}
          >
            {COLUMNS.find((c) => c.key === moves.next)?.label} →
          </button>
        )}
      </div>
    </div>
  );
}
