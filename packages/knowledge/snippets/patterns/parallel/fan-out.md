---
id: fan-out
name: Fan-Out
type: pattern
category: parallel
tags: [parallel, broadcast, scale, identical-workers]
minNodes: 2
maxNodes: 10
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1500
  costMultiplier: 3.0
---

# Fan-Out

## Description
One input is broadcast to multiple identical workers that process it in parallel. Unlike the pyramid-down pattern where each worker gets a different subtask, in fan-out every worker receives the same processing instruction but operates on different data. This pattern is the agent equivalent of horizontal scaling — you add more workers to handle more data without changing the logic. Each worker runs independently and produces an independent output. There is no aggregation step in the pure fan-out pattern; if aggregation is needed, combine this with fan-in to create a map-reduce.

## Diagram
```
                    [Dispatcher]
                   /   |    |   \
                  v    v    v    v
               [W1]  [W2]  [W3]  [W4]
                |      |     |     |
                v      v     v     v
              [O1]   [O2]  [O3]  [O4]
```

## When to Use
- The same operation must be performed on multiple independent data chunks
- You want to reduce wall-clock time through parallelism
- Each data chunk can be processed without knowledge of other chunks
- The workload is homogeneous (same task, different data)
- You need to process a batch of similar items (e.g., review 10 PRs, analyze 10 files, test 10 endpoints)

## Anti-Patterns
- Do not use when workers need to coordinate or share state
- Avoid when the number of data chunks is very small (1-2) — overhead exceeds benefit
- Not suitable when results must be synthesized into a single output (add a fan-in aggregator)
- Do not use when each data chunk requires fundamentally different processing logic (use router-specialists instead)

## Node Templates

### Dispatcher
- **Role**: Receives the input data set and distributes chunks to workers. Handles the splitting logic: divides data into roughly equal portions, assigns each to a worker, and tracks which worker received which chunk. The dispatcher does not process data itself.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Glob, Grep]
- **Prompt Template**: You are a task dispatcher. You will receive a set of items to process and a processing instruction. Split the items into N equal groups (one per available worker). For each group, create a work package containing: (1) the items to process, (2) the processing instruction (identical for all), (3) a chunk identifier for traceability. Output the work packages as a JSON array.

### Workers (W1-WN): Parallel Processors
- **Role**: Each worker receives one chunk of data and the shared processing instruction. Applies the same logic to its chunk independently. Produces a result set that corresponds to its input chunk. Workers are stateless and interchangeable.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are a parallel processing agent. You will receive a data chunk and a processing instruction. Apply the instruction to every item in your chunk. Produce structured output for each item. Maintain the chunk identifier in your output so results can be traced back to their source. Process items thoroughly and consistently.

## Edge Flow
User Input -> Dispatcher (sequential, splits data into chunks)
Dispatcher -> Workers W1-WN (parallel broadcast, each receives one chunk)
Workers W1-WN -> Independent Outputs O1-ON (direct, no aggregation in pure fan-out)
