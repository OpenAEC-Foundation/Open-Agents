import type {
  DispatcherNodeData,
  AgentNodeData,
  AgentRuntime,
  ModelProvider,
} from "@open-agents/shared";

export interface ClassificationResult {
  selectedAgentIds: string[];
  reasoning: string;
}

interface ConnectedAgent {
  id: string;
  name: string;
  description?: string;
}

/**
 * Classify a task using the dispatcher's routing prompt and an LLM.
 * Returns which connected agents should handle the task.
 *
 * Falls back to selecting ALL agents if classification fails.
 */
export async function classifyTask(
  dispatcherData: DispatcherNodeData,
  connectedAgents: ConnectedAgent[],
  inputContext: string,
  getRuntimeForModel: (model: string) => AgentRuntime,
): Promise<ClassificationResult> {
  if (connectedAgents.length === 0) {
    return { selectedAgentIds: [], reasoning: "No connected agents found." };
  }

  // If only one agent, skip classification
  if (connectedAgents.length === 1) {
    return {
      selectedAgentIds: [connectedAgents[0].id],
      reasoning: `Only one agent available: ${connectedAgents[0].name}`,
    };
  }

  // Build classification prompt
  const agentList = connectedAgents
    .map((a) => `- "${a.name}" (ID: ${a.id})${a.description ? `: ${a.description}` : ""}`)
    .join("\n");

  const systemPrompt = [
    "You are a task router. Classify the following task and determine which specialist agent(s) should handle it.",
    "",
    "Available agents:",
    agentList,
    "",
    "User routing instructions:",
    dispatcherData.routingPrompt,
    "",
    `Select 1 to ${Math.min(dispatcherData.maxParallel, connectedAgents.length)} agents.`,
    "",
    "Respond with ONLY a JSON object (no markdown, no explanation outside the JSON):",
    '{',
    '  "selectedAgents": ["agent-id-1", "agent-id-2"],',
    '  "reasoning": "Brief explanation of routing decision"',
    '}',
  ].join("\n");

  const userPrompt = inputContext || "No previous context provided. Route to the most appropriate agent(s).";

  try {
    const runtime = getRuntimeForModel(dispatcherData.routingModel);
    let llmOutput = "";

    for await (const event of runtime.execute({
      nodeId: "__dispatcher_classify__",
      agent: {
        name: "Dispatcher Classifier",
        model: dispatcherData.routingModel,
        systemPrompt,
        tools: [],
      } as AgentNodeData,
      previousOutput: userPrompt,
    })) {
      if (event.type === "output" && event.data) {
        llmOutput = event.data;
      } else if (event.type === "error") {
        throw new Error(event.data ?? "Classification runtime error");
      }
    }

    // Parse the JSON response
    const parsed = parseClassificationResponse(llmOutput, connectedAgents);
    return parsed;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`Dispatcher classification failed: ${errorMsg}. Falling back to all agents.`);

    // Fallback: select all agents (up to maxParallel)
    return {
      selectedAgentIds: connectedAgents
        .slice(0, dispatcherData.maxParallel)
        .map((a) => a.id),
      reasoning: `Classification failed (${errorMsg}). Routing to all available agents.`,
    };
  }
}

/**
 * Parse the LLM classification response.
 * Extracts agent IDs from JSON, validates against actual connected agents.
 */
function parseClassificationResponse(
  raw: string,
  connectedAgents: ConnectedAgent[],
): ClassificationResult {
  const validIds = new Set(connectedAgents.map((a) => a.id));
  const validNames = new Map(connectedAgents.map((a) => [a.name.toLowerCase(), a.id]));

  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = raw.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object in the text
  const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    jsonStr = braceMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr) as {
      selectedAgents?: string[];
      reasoning?: string;
    };

    const rawIds = parsed.selectedAgents ?? [];
    const reasoning = parsed.reasoning ?? "No reasoning provided.";

    // Validate and resolve IDs (accept both IDs and names)
    const selectedAgentIds: string[] = [];
    for (const rawId of rawIds) {
      if (validIds.has(rawId)) {
        selectedAgentIds.push(rawId);
      } else {
        // Try matching by name (case-insensitive)
        const matchedId = validNames.get(rawId.toLowerCase());
        if (matchedId) {
          selectedAgentIds.push(matchedId);
        }
      }
    }

    // If no valid agents selected, fall back to all
    if (selectedAgentIds.length === 0) {
      return {
        selectedAgentIds: connectedAgents.map((a) => a.id),
        reasoning: `${reasoning} (No valid agent IDs matched — routing to all)`,
      };
    }

    return { selectedAgentIds, reasoning };
  } catch {
    // JSON parsing failed — fall back to all agents
    return {
      selectedAgentIds: connectedAgents.map((a) => a.id),
      reasoning: `Could not parse classification response. Routing to all agents.`,
    };
  }
}
