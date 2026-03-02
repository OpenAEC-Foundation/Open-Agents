---
id: batch-summarize
name: Batch Summarize
type: pattern
category: efficiency
tags: [summarization, chunking, long-content, merge]
minNodes: 3
maxNodes: 6
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 800
  costMultiplier: 1.5
---

# Batch Summarize

## Description
Designed for processing long content that exceeds a single model's effective context window. The content is split into manageable chunks, each chunk is summarized independently by a cheap model, and then the summaries are merged into a final consolidated summary. The key efficiency comes from compression: each chunk summary is much shorter than the original chunk, so the merge step works with a fraction of the total tokens. This creates an information pyramid where detail is progressively compressed. For very long content, the pattern can be applied recursively: summarize chunks, then summarize the summaries, then summarize those.

## Diagram
```
[Long Content]
       |
       v
   [Chunker]
   /   |    \
  v    v     v
[S1]  [S2]  [S3]     (parallel summarizers)
  \    |    /
   v   v   v
  [Merger]            (combines summaries)
     |
     v
 [Final Summary]
```

## When to Use
- The input content is too long for a single model's context window
- You need a summary or analysis of a large document, codebase, or dataset
- Compression of information is acceptable (some detail will be lost)
- Each chunk can be meaningfully summarized in isolation
- The final summary needs to capture themes and patterns across all chunks

## Anti-Patterns
- Do not use when every detail matters and information loss is unacceptable
- Avoid when chunks are so interdependent that isolated summarization loses critical context
- Not suitable for content where the overall narrative structure matters more than individual sections
- Do not use when the content is short enough for a single model to process directly
- Avoid recursive summarization beyond 2 levels (too much information loss)

## Node Templates

### Chunker
- **Role**: Splits the long content into chunks that are small enough for individual summarizers but large enough to maintain meaningful context. Respects logical boundaries (chapters, sections, files, functions). Produces metadata about the chunking strategy so the merger understands the original structure.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Glob]
- **Prompt Template**: You are a content chunker. Split the following content into chunks of approximately {chunk_size} tokens each. Rules: (1) respect logical boundaries — do not split in the middle of sections, paragraphs, or code blocks, (2) include a brief context header for each chunk (position in the original, topic), (3) output metadata: total chunks, boundaries used, original content length.

### Summarizers (S1-SN): Parallel Chunk Processors
- **Role**: Each summarizer receives one chunk and produces a concise summary capturing the key information, themes, and notable details. Summaries should be 10-20% of the original chunk length. Must preserve enough context for the merger to understand how this chunk relates to the overall content.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read]
- **Prompt Template**: You are a summarization agent. Summarize the following content chunk into a concise summary (10-20% of original length). Capture: (1) main points and key information, (2) notable details, data points, or findings, (3) the chunk's topic and scope (so a merger can understand its place in the whole). Preserve factual accuracy. Do not add interpretation beyond what is in the source content. Include the chunk identifier in your output.

### Merger
- **Role**: Receives all chunk summaries plus the chunker's metadata. Combines them into a single coherent final summary that captures the overall themes, key findings, and important details from across all chunks. The merger adds value beyond concatenation by identifying cross-chunk patterns, resolving redundancies, and creating a narrative flow.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write]
- **Prompt Template**: You are a summary merger. You will receive summaries of N chunks from a larger content piece, plus chunking metadata. Produce a unified final summary: (1) executive overview (2-3 sentences), (2) key themes and findings across all chunks, (3) notable details worth preserving, (4) any patterns or trends that emerge from the cross-chunk view. The final summary should be self-contained and useful without access to the original content. Length: approximately {target_length}.

## Edge Flow
Long Content -> Chunker (sequential, splits content)
Chunker -> Summarizers S1-SN (parallel fan-out, each receives one chunk)
Summarizers S1-SN -> Merger (fan-in, all chunk summaries converge)
Merger -> Final Summary (sequential, produces unified result)
