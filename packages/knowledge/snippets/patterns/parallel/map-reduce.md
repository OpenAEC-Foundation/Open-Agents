---
id: map-reduce
name: Map-Reduce
type: pattern
category: parallel
tags: [parallel, aggregation, batch, data-processing, large-scale]
minNodes: 4
maxNodes: 12
tokenProfile:
  avgInputPerNode: 1800
  avgOutputPerNode: 1200
  costMultiplier: 3.5
---

# Map-Reduce

## Description
Inspired by the MapReduce programming model, this pattern combines fan-out with fan-in through three distinct phases. First, a splitter divides a large input into independent chunks. Second, multiple mapper agents process each chunk in parallel, extracting or transforming data. Third, a reducer agent combines all partial results into a final output. This is the go-to pattern for processing data that exceeds a single model's context window. The key design challenge is choosing chunk boundaries that preserve meaningful context while enabling parallel processing.

## Diagram
```
                  [Splitter]
                /    |     \
               v     v      v
           [Map 1] [Map 2] [Map 3]     (parallel processing)
               \     |     /
                v    v    v
                 [Reducer]              (aggregation)
                    |
                    v
                 [Output]
```

## When to Use
- The input is too large for a single model's context window (e.g., entire codebases, long documents)
- The processing task is naturally parallelizable across chunks
- You need to summarize, analyze, or transform large bodies of text or code
- Each chunk can be processed independently before combining results
- You want to maximize throughput for data-intensive tasks

## Anti-Patterns
- Do not use when chunk boundaries break important context (e.g., splitting in the middle of a function)
- Avoid when the reduction step is trivially simple (just concatenation adds no value)
- Not suitable when order-dependent processing is required and ordering is lost in the map phase
- Do not use when the overhead of splitting and reducing exceeds the time saved by parallel mapping
- Avoid when the dataset is small enough for a single agent to handle efficiently

## Node Templates

### Splitter
- **Role**: Analyzes the input and divides it into independent, self-contained chunks suitable for parallel processing. Must ensure chunks are balanced in size, maintain meaningful boundaries (e.g., file boundaries, paragraph boundaries, function boundaries), and include sufficient context for independent processing. Produces metadata about the chunking strategy for the reducer.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Glob, Grep]
- **Prompt Template**: You are a data splitter. Divide the input into N independent chunks for parallel processing. Rules: (1) Each chunk must be self-contained — do not split in the middle of logical units (functions, paragraphs, sections). (2) Chunks should be roughly equal in size. (3) Include a brief context header in each chunk explaining what it contains. (4) Output a metadata summary: total chunks, size distribution, chunking strategy used.

### Mappers (Map 1-N): Parallel Processors
- **Role**: Each mapper receives one chunk and applies the specified transformation or analysis. Mappers are identical in their processing logic but operate on different data. They produce structured partial results that the reducer can combine. Each mapper's output must include its chunk identifier for proper reassembly.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, Glob]
- **Prompt Template**: You are a map-phase processor. You will receive one chunk of a larger dataset plus a processing instruction. Apply the instruction to your chunk thoroughly. Produce a structured partial result containing: (1) chunk identifier, (2) processed output in the requested format, (3) any cross-references to other chunks you noticed (for the reducer's benefit), (4) processing metadata (items processed, issues found, etc.).

### Reducer
- **Role**: Receives all partial results from the mappers and combines them into a single coherent output. Handles deduplication, conflict resolution, cross-reference linking, and proper ordering. Uses the splitter's metadata to understand the original structure. Produces a final result that reads as if the entire input was processed by a single agent.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit]
- **Prompt Template**: You are a reduce-phase aggregator. You will receive partial results from N parallel mappers plus the splitter's metadata. Combine all partial results into a single coherent output. Steps: (1) order partial results by their original chunk position, (2) deduplicate any findings that appear in multiple chunks, (3) resolve cross-references between chunks, (4) produce a unified output that maintains proper structure and flow. The final result should be seamless — no evidence of chunking should be visible.

## Edge Flow
User Input -> Splitter (sequential, analyzes and chunks input)
Splitter -> Mappers Map1-MapN (parallel fan-out, each receives one chunk)
Mappers Map1-MapN -> Reducer (fan-in, all partial results converge)
Reducer -> Output (sequential, produces unified result)
