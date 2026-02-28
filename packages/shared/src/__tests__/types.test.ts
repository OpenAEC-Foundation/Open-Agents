import { describe, it, expect } from 'vitest';
import type { ModelId, AgentNodeData, CanvasConfig } from '../index.js';

describe('shared types', () => {
  it('ModelId accepts valid provider/model format', () => {
    const id: ModelId = 'anthropic/claude-sonnet-4-6';
    expect(id).toBe('anthropic/claude-sonnet-4-6');
  });

  it('CanvasConfig has required fields', () => {
    const config: CanvasConfig = { nodes: [], edges: [] };
    expect(config.nodes).toEqual([]);
    expect(config.edges).toEqual([]);
  });

  it('AgentNodeData has required fields', () => {
    const data: AgentNodeData = {
      name: 'Test Agent',
      model: 'anthropic/claude-sonnet-4-6',
      systemPrompt: 'Test prompt',
      tools: ['Read', 'Glob'],
    };
    expect(data.name).toBe('Test Agent');
    expect(data.tools).toHaveLength(2);
  });
});
