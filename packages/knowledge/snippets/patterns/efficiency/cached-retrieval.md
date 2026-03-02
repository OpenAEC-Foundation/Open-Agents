---
id: cached-retrieval
name: Cached Retrieval Pattern
type: pattern
category: efficiency
tags: [caching, retrieval, cost, optimization]
minNodes: 2
maxNodes: 3
tokenProfile:
  avgInputPerNode: 1500
  avgOutputPerNode: 1000
  costMultiplier: 0.5
---

# Cached Retrieval Pattern

## Description
A retriever agent first checks a cache or knowledge base for existing answers before invoking an expensive generator agent. If a cached result is found and still valid, it is returned directly. If not, the generator produces a fresh result which is then cached for future use. This dramatically reduces cost for repetitive queries.

## Diagram
```
[Input] --> [Retriever] --cache hit--> [Output]
                |
            cache miss
                |
                v
           [Generator] --> [Cache + Output]
```

## When to Use
- Many queries are repetitive or similar
- Generating fresh answers is expensive (in tokens or time)
- Cached results remain valid for a reasonable period
- You want to minimize cost without sacrificing quality for known queries

## Anti-Patterns
- Do not use when every query is unique
- Avoid when cached results become stale quickly
- Not suitable when the cost of cache management exceeds savings
- Do not use when exact freshness is critical for every response

## Node Templates

### Retriever
- **Role**: Checks the cache for an existing valid answer. If found, returns it directly. If not, forwards to the generator.
- **Model**: anthropic/claude-haiku-4-5
- **Tools**: [Read, Grep]
- **Prompt Template**: Check if we have a cached answer for this query. If a match is found and still valid, return it. If no match or the cached answer is stale, pass the query to the generator.

### Generator
- **Role**: Produces a fresh answer for cache misses. The result is stored for future retrieval.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Glob, Grep]
- **Prompt Template**: Generate a complete, high-quality answer for this query. Your output will be cached for future use, so be thorough and self-contained.

## Edge Flow
Input -> Retriever (direct)
Retriever -> Output (if cache hit)
Retriever -> Generator (if cache miss)
Generator -> Cache + Output (store and return)
