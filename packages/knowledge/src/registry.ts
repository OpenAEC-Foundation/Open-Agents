import type {
  RoutingPattern,
  OrchestrationPrinciple,
  BuildingBlock,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  PatternCategory,
} from "@open-agents/shared";
import { loadPatterns, loadPrinciples, loadBlocks } from "./loader.js";

/**
 * Knowledge registry that indexes and searches across all knowledge types.
 * Initialize once, query many times.
 */
export class KnowledgeRegistry {
  private patterns: RoutingPattern[] = [];
  private principles: OrchestrationPrinciple[] = [];
  private blocks: BuildingBlock[] = [];

  private patternIndex = new Map<string, RoutingPattern>();
  private principleIndex = new Map<string, OrchestrationPrinciple>();
  private blockIndex = new Map<string, BuildingBlock>();

  /**
   * Load all snippets from disk and build indexes.
   * Must be called before any query methods.
   */
  async initialize(): Promise<void> {
    this.patterns = await loadPatterns();
    this.principles = await loadPrinciples();
    this.blocks = await loadBlocks();

    // Build indexes
    this.patternIndex.clear();
    for (const p of this.patterns) {
      this.patternIndex.set(p.id, p);
    }

    this.principleIndex.clear();
    for (const p of this.principles) {
      this.principleIndex.set(p.id, p);
    }

    this.blockIndex.clear();
    for (const b of this.blocks) {
      this.blockIndex.set(b.id, b);
    }
  }

  // =============================================
  // Pattern accessors
  // =============================================

  getPatterns(): RoutingPattern[] {
    return this.patterns;
  }

  getPattern(id: string): RoutingPattern | undefined {
    return this.patternIndex.get(id);
  }

  getPatternsByCategory(category: PatternCategory): RoutingPattern[] {
    return this.patterns.filter((p) => p.category === category);
  }

  // =============================================
  // Principle accessors
  // =============================================

  getPrinciples(): OrchestrationPrinciple[] {
    return this.principles;
  }

  getPrinciple(id: string): OrchestrationPrinciple | undefined {
    return this.principleIndex.get(id);
  }

  // =============================================
  // Block accessors
  // =============================================

  getBlocks(): BuildingBlock[] {
    return this.blocks;
  }

  getBlock(id: string): BuildingBlock | undefined {
    return this.blockIndex.get(id);
  }

  // =============================================
  // Search
  // =============================================

  /**
   * Search across all knowledge types with scoring.
   *
   * Scoring weights:
   * - Exact tag match: +0.3 per matching tag
   * - Category match (patterns only): +0.5
   * - Name contains query text: +0.4
   * - Description contains query text: +0.2
   *
   * Results are sorted by score descending, then alphabetically by name.
   */
  search(query: KnowledgeSearchQuery): KnowledgeSearchResult[] {
    const results: KnowledgeSearchResult[] = [];

    // Build candidate list based on type filter
    const candidates = this.buildCandidates(query.type);

    for (const candidate of candidates) {
      let score = 0;

      // Tag matching: +0.3 per matching tag
      if (query.tags && query.tags.length > 0) {
        for (const tag of query.tags) {
          if (candidate.tags.includes(tag)) {
            score += 0.3;
          }
        }
      }

      // Category matching (patterns only): +0.5
      if (
        query.category &&
        candidate.type === "pattern" &&
        candidate.category === query.category
      ) {
        score += 0.5;
      }

      // Free text query matching
      if (query.query) {
        const queryLower = query.query.toLowerCase();
        if (candidate.name.toLowerCase().includes(queryLower)) {
          score += 0.4;
        }
        if (candidate.description.toLowerCase().includes(queryLower)) {
          score += 0.2;
        }
      }

      // If type filter is specified but no other criteria, include all of that type
      // with a base score so they appear in results
      if (query.type && !query.tags && !query.category && !query.query) {
        score = 0.1;
      }

      // Only include results with a positive score
      if (score > 0) {
        results.push({
          id: candidate.id,
          name: candidate.name,
          type: candidate.type,
          tags: candidate.tags,
          description: candidate.description,
          score: Math.min(score, 1.0),
        });
      }
    }

    // Sort by score descending, then alphabetically by name
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });

    return results;
  }

  /**
   * Build a flat list of search candidates from all indexed knowledge,
   * optionally filtered by type.
   */
  private buildCandidates(
    typeFilter?: "pattern" | "principle" | "block"
  ): SearchCandidate[] {
    const candidates: SearchCandidate[] = [];

    if (!typeFilter || typeFilter === "pattern") {
      for (const p of this.patterns) {
        candidates.push({
          id: p.id,
          name: p.name,
          type: "pattern",
          tags: p.tags,
          description: p.description,
          category: p.category,
        });
      }
    }

    if (!typeFilter || typeFilter === "principle") {
      for (const p of this.principles) {
        candidates.push({
          id: p.id,
          name: p.name,
          type: "principle",
          tags: [],
          description: p.description,
        });
      }
    }

    if (!typeFilter || typeFilter === "block") {
      for (const b of this.blocks) {
        candidates.push({
          id: b.id,
          name: b.name,
          type: "block",
          tags: [],
          description: b.description,
        });
      }
    }

    return candidates;
  }
}

/** Internal search candidate with unified shape */
interface SearchCandidate {
  id: string;
  name: string;
  type: "pattern" | "principle" | "block";
  tags: string[];
  description: string;
  category?: string;
}
