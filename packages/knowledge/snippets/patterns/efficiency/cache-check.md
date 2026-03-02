---
id: cache-check
name: Cache Check
type: pattern
category: efficiency
tags: [caching, deduplication, cost-reduction, lookup]
minNodes: 2
maxNodes: 3
tokenProfile:
  avgInputPerNode: 1500
  avgOutputPerNode: 1000
  costMultiplier: 0.8
---

# Cache Check

## Description
Before invoking an expensive model to process a request, a lightweight cache-check agent first determines whether the same or a sufficiently similar request has been processed before. If a cached result exists and is still valid, it is returned immediately without invoking the expensive model — saving both cost and latency. The cache-check agent handles cache key generation, similarity matching, and freshness validation. This pattern is most effective in environments with repetitive queries (support systems, code review, documentation lookup) where the same questions are asked frequently. The costMultiplier is below 1.0 because the pattern saves more than it costs on average.

## Diagram
```
[Input] --> [Cache Checker] --hit--> [Cached Result] --> [Output]
                 |
             cache miss
                 |
                 v
          [Processor] --> [Store in Cache] --> [Output]
```

## When to Use
- Your system receives many similar or identical queries over time
- Processing is expensive (premium models, long chains) and caching would provide significant savings
- Results have a useful shelf life (they remain valid for a meaningful period)
- You can define meaningful similarity between queries (exact match or semantic similarity)
- The cache-check overhead is much cheaper than the processing it can avoid

## Anti-Patterns
- Do not use when every query is unique and cache hit rate would be near zero
- Avoid when results become stale quickly and freshness is critical
- Not suitable when the cache-check cost approaches the processing cost (no net savings)
- Do not use for tasks with side effects (cached results might not reflect current state)
- Avoid when semantic similarity matching produces too many false positives (wrong cached results returned)

## Node Templates

### Cache Checker
- **Role**: Receives the incoming request and checks whether a suitable cached result exists. Generates a cache key from the request (either exact hash or semantic embedding), queries the cache store, and validates that any found result is still fresh and relevant. If a valid cache hit is found, returns it directly. If cache miss, passes the request to the processor with a note that the result should be cached.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Grep]
- **Prompt Template**: You are a cache lookup agent. For the incoming request: (1) generate a normalized cache key by extracting the core intent (ignore formatting, whitespace, minor wording differences), (2) check the cache store for matching entries, (3) if a match is found, verify its freshness (created within the TTL window) and relevance (does it actually answer this specific query?). Return: {"cache_status": "hit|miss", "cache_key": "...", "cached_result": "..." or null, "freshness": "valid|expired|null"}.

### Processor
- **Role**: Handles cache misses by processing the request fully. After producing the result, stores it in the cache with appropriate metadata (timestamp, cache key, TTL). This is the expensive path that the cache pattern aims to minimize.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are the main processor. The cache did not have a result for this request. Process it fully and produce a complete result. After completion, also output cache metadata: {"cache_key": "...", "result": "...", "ttl_seconds": 3600, "tags": ["..."]}. The result and metadata will be stored for future cache lookups.

### Cache Manager (Optional)
- **Role**: Manages cache lifecycle: eviction of expired entries, cache size management, hit rate monitoring, and cache warming for predicted common queries. Runs periodically rather than per-request.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Write, Bash]
- **Prompt Template**: You are a cache manager. Review the current cache state: (1) evict entries past their TTL, (2) remove least-recently-used entries if cache exceeds size limit, (3) report cache statistics: total entries, hit rate, average age, size. (4) suggest cache warming candidates based on query patterns.

## Edge Flow
User Input -> Cache Checker (sequential, lightweight lookup)
Cache Checker -> Output (if cache hit with valid freshness)
Cache Checker -> Processor (if cache miss, passes full request)
Processor -> Cache Store (stores result for future lookups)
Processor -> Output (returns processed result)
