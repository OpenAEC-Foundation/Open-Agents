---
name: oa-teams-coordination
description: "Coordinate multi-agent teams using staging patterns and shared result directories. Use when managing a group of workers writing to shared output, sequencing phases, or using oa team commands. Activates for: oa team, staging area, shared results, phase coordination, L-005."
user-invocable: false
allowed-tools: Bash(oa *)
---

## Critical Rules

- ALWAYS write worker output to a staging directory first — because merging directly to main files causes race conditions and overwrites between parallel agents (L-005).
- NEVER skip the Verify phase — because agents may produce incomplete or truncated output that silently corrupts the merged result.

## Stage → Merge → Verify → Cleanup Pattern (L-005)

```
Phase 1 — Stage: Workers write to /tmp/staging/<agent-name>/
Phase 2 — Merge: Orchestrator reads all staging files → merges to main files
Phase 3 — Verify: Check completeness, format, cross-references
Phase 4 — Cleanup: Remove staging area after verified merge
```

### Phase Overlap (L-011)

Start the next phase early when there are no inter-phase dependencies:
- Combiner can start when first 2 of 3 researchers are done (if outputs are independent)
- Verify can run per-file as files land in staging (don't wait for all workers)
- Cleanup runs immediately after each verified file

## Instructions

1. Create a shared results directory before spawning workers:
   ```bash
   mkdir -p /tmp/shared-results/staging
   ```

2. Spawn workers, each writing to their own staging subdirectory:
   ```bash
   oa run "Task A. Write output to /tmp/shared-results/staging/worker-a/result.md" \
     --name worker-a --model claude/sonnet --direct
   oa run "Task B. Write output to /tmp/shared-results/staging/worker-b/result.md" \
     --name worker-b --model claude/sonnet --direct
   ```

3. Monitor workers until done:
   ```bash
   oa status
   ```

4. Merge staging outputs to main files (orchestrator does this, not an agent):
   ```bash
   cat /tmp/shared-results/staging/worker-*/result.md > /tmp/shared-results/final.md
   ```

5. Verify completeness before cleanup:
   - Check line count / section headers match expected structure
   - Cross-check agent outputs for consistency

6. Cleanup staging area:
   ```bash
   rm -rf /tmp/shared-results/staging/
   ```

## Team CLI Commands

| Command | Purpose |
|---------|---------|
| `oa team create <name> <member1> <member2>` | Create a named agent team |
| `oa team list` | List all teams |
| `oa team add-member <team> <agent>` | Add agent to team |
| `oa team delete <name>` | Delete a team |
| `oa task create <team> <title>` | Create a task for a team |
| `oa task list <team>` | List tasks for a team |
| `oa task complete <team> <task_id>` | Mark task as completed |

## Patterns

### Pattern 1: Full Stage → Merge → Verify → Cleanup
```bash
# Stage
mkdir -p /tmp/staging/
oa run "Write analysis to /tmp/staging/worker-a.md" --name worker-a --model claude/sonnet --direct
oa run "Write analysis to /tmp/staging/worker-b.md" --name worker-b --model claude/sonnet --direct

# Wait for completion
oa status  # poll until both are done

# Merge
cat /tmp/staging/worker-a.md /tmp/staging/worker-b.md > /tmp/final-analysis.md

# Verify
wc -l /tmp/final-analysis.md  # expect > 0 lines

# Cleanup
rm -rf /tmp/staging/
```

### Pattern 2: Team with shared results dir
```bash
oa team create my-team worker-a worker-b
oa task create my-team "Research and compile report"
# Agents share: /tmp/shared-results/ as communication channel
```

## Anti-Patterns

- Bad: Workers writing directly to the same output file — parallel writes corrupt the file.
- Good: Each worker writes to `/tmp/staging/<worker-name>/output.md`; orchestrator merges.
- Bad: Cleaning up staging before Verify completes — losing the source of truth for re-runs.
- Good: Keep staging until Verify passes; only then cleanup.
- Bad: Waiting for ALL workers before starting Merge — wastes time when outputs are independent.
- Good: Apply phase overlap (L-011) and merge each file as it lands.

## References

- Related: oa-orchestration-spawn, oa-prompting-delegation, oa-web-dashboard
