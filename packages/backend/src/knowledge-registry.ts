import { KnowledgeRegistry } from "@open-agents/knowledge";

let registry: KnowledgeRegistry | null = null;

/** Get the singleton KnowledgeRegistry instance (lazy-initialized). */
export async function getKnowledgeRegistry(): Promise<KnowledgeRegistry> {
  if (!registry) {
    registry = new KnowledgeRegistry();
    await registry.initialize();
  }
  return registry;
}
