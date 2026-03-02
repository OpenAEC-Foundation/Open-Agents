---
id: research-agent
name: Research Agent
type: pattern
category: specialist
tags: [research, web, analysis, information-gathering]
minNodes: 2
maxNodes: 4
tokenProfile:
  avgInputPerNode: 3000
  avgOutputPerNode: 2500
  costMultiplier: 2.5
---

# Research Agent

## Description
A specialized pattern for information gathering and analysis. A search agent finds relevant sources using web search and file exploration, a reader agent processes and summarizes each source, and a synthesizer agent produces a comprehensive research report. This pattern automates the research workflow while maintaining source attribution.

## Diagram
```
[Query] --> [Search Agent] --> [Reader A] \
                           --> [Reader B]  --> [Synthesizer] --> [Report]
                           --> [Reader C] /
```

## When to Use
- The task requires gathering information from multiple sources
- You need comprehensive research with source attribution
- The answer requires synthesizing information across documents
- You want to automate repetitive research workflows

## Anti-Patterns
- Do not use when the answer exists in a single known source
- Avoid for time-sensitive queries where search latency is unacceptable
- Not suitable when sources require authentication or special access
- Do not use when the research scope is unbounded

## Node Templates

### Search Agent
- **Role**: Finds relevant sources for the research query using web search and file exploration.
- **Model**: anthropic/claude-haiku-4-5
- **Tools**: [WebSearch, Glob, Grep]
- **Prompt Template**: Find relevant sources for the following research query. Return a list of sources with URLs and brief descriptions of what each contains. Prioritize authoritative sources.

### Reader
- **Role**: Reads and summarizes a single source, extracting key findings relevant to the research query.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, WebFetch]
- **Prompt Template**: Read the following source and extract key findings relevant to the research query. Provide a structured summary with direct quotes where appropriate. Note any limitations or biases.

### Synthesizer
- **Role**: Combines summaries from all readers into a comprehensive research report with citations.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write]
- **Prompt Template**: Synthesize the following source summaries into a comprehensive research report. Organize by themes, not by source. Cite sources for key claims. Highlight areas of agreement and disagreement. Note gaps in the research.

## Edge Flow
Query -> Search Agent (direct)
Search Agent -> Readers (parallel, one per source)
Readers -> Synthesizer (join with summaries)
Synthesizer -> Report (direct)
