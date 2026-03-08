# fix-ts-client — Bevestiging

## Toegevoegde functies aan client.ts

De volgende functies zijn toegevoegd aan `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/web/src/api/client.ts`:

| Functie | Methode | Endpoint |
|---------|---------|----------|
| `pauseAgent(name)` | POST | `/api/agents/<name>/pause` |
| `resumeAgent(name)` | POST | `/api/agents/<name>/resume` |
| `fetchPipelines()` | GET | `/api/pipeline` → `Agent[]` |
| `fetchTeams()` | GET | `/api/teams` |
| `createTeam(name, members)` | POST | `/api/teams` |
| `fetchTasks(team)` | GET | `/api/tasks/<team>` |
| `createTask(team, task)` | POST | `/api/tasks/<team>` |
| `updateTask(team, taskId, update)` | PUT | `/api/tasks/<team>/<taskId>` |
| `fetchCheckpoints()` | GET | `/api/checkpoints` |
| `resumeFromCheckpoint(agent)` | POST | `/api/resume/<agent>` |
| `fetchGuardians()` | GET | `/api/guardians` |
| `fetchSessionStatus()` | GET | `/api/session/status` |

## Stijl
Alle functies volgen exact het patroon van bestaande functies: `async function`, `fetch`, `return res.json()`. Geen extra imports toegevoegd.
