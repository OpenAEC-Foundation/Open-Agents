import { useEffect, useState } from 'react';
import { fetchTeams, createTeam, deleteTeam, addTeamMember } from '../../api/client';

interface Team {
  name: string;
  members: string[];
  created_at: number;
  updated_at: number;
}

export function TeamsTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create team form
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Add member form
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [memberInput, setMemberInput] = useState('');

  async function load() {
    try {
      const data = await fetchTeams();
      setTeams(Array.isArray(data) ? (data as Team[]) : []);
      setError(null);
    } catch {
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createTeam(newName.trim(), []);
      setNewName('');
      await load();
    } catch {
      setError('Failed to create team');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(name: string) {
    try {
      await deleteTeam(name);
      await load();
    } catch {
      setError(`Failed to delete team '${name}'`);
    }
  }

  async function handleAddMember(team: string) {
    if (!memberInput.trim()) return;
    try {
      await addTeamMember(team, memberInput.trim());
      setMemberInput('');
      setAddingTo(null);
      await load();
    } catch {
      setError(`Failed to add member to '${team}'`);
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-oa-border bg-oa-surface shrink-0">
        <span className="text-xs font-semibold text-oa-text-muted uppercase tracking-wider">Agent Teams</span>
        <div className="flex-1" />
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="New team name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-1.5 bg-oa-bg border rounded-md text-oa-text text-xs w-48"
            style={{ borderColor: 'var(--color-oa-border)' }}
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-4 py-1.5 bg-oa-accent text-oa-bg rounded-md text-xs font-bold cursor-pointer hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating…' : '+ New Team'}
          </button>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-700 rounded-md text-red-400 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full text-oa-text-dim text-sm">Loading…</div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-oa-text-dim gap-2">
            <span className="text-sm">No teams yet</span>
            <span className="text-xs">Create your first team using the form above</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.name}
                className="flex flex-col gap-3 p-4 rounded-lg border border-oa-border bg-oa-surface"
              >
                {/* Team header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-oa-text">{team.name}</span>
                  <button
                    onClick={() => handleDelete(team.name)}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>

                {/* Members list */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-oa-text-muted uppercase tracking-wider">
                    Members ({team.members.length})
                  </span>
                  {team.members.length === 0 ? (
                    <span className="text-xs text-oa-text-dim italic">No members yet</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {team.members.map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 bg-oa-accent/10 border border-oa-accent/30 rounded text-xs text-oa-accent"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add member */}
                {addingTo === team.name ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Agent name..."
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMember(team.name)}
                      className="flex-1 px-2 py-1 bg-oa-bg border rounded text-xs text-oa-text"
                      style={{ borderColor: 'var(--color-oa-border)' }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddMember(team.name)}
                      className="px-2 py-1 bg-oa-accent text-oa-bg rounded text-xs font-bold cursor-pointer hover:brightness-110"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingTo(null); setMemberInput(''); }}
                      className="px-2 py-1 text-oa-text-muted hover:text-oa-text text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(team.name)}
                    className="text-xs text-oa-text-muted hover:text-oa-accent cursor-pointer text-left"
                  >
                    + Add member
                  </button>
                )}

                {/* Timestamp */}
                <span className="text-xs text-oa-text-dim">
                  Created {new Date(team.created_at * 1000).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
