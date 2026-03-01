import { describe, it, expect } from 'vitest';
import type { AgentRuntime, AgentEvent, RuntimeExecutionConfig } from '../index.js';

describe('runtime types', () => {
  it('AgentEvent type is usable', () => {
    const event: AgentEvent = {
      type: 'start',
      nodeId: 'test-1',
      timestamp: new Date().toISOString(),
    };
    expect(event.type).toBe('start');
    expect(event.nodeId).toBe('test-1');
  });

  it('RuntimeExecutionConfig type is usable', () => {
    const config: RuntimeExecutionConfig = {
      nodeId: 'node-1',
      agent: {
        name: 'Test',
        model: 'anthropic/claude-sonnet-4-6',
        systemPrompt: 'Hello',
        tools: [],
      },
    };
    expect(config.nodeId).toBe('node-1');
  });

  it('RuntimeExecutionConfig supports optional safetyRules (D-035)', () => {
    const config: RuntimeExecutionConfig = {
      nodeId: 'node-1',
      agent: {
        name: 'Test',
        model: 'anthropic/claude-sonnet-4-6',
        systemPrompt: 'Hello',
        tools: ['Bash'],
      },
      safetyRules: {
        bashBlacklist: ['rm -rf', 'sudo .*'],
        fileWhitelist: [],
      },
    };
    expect(config.safetyRules?.bashBlacklist).toContain('rm -rf');
    expect(config.safetyRules?.bashBlacklist).toHaveLength(2);
  });

  it('RuntimeExecutionConfig works without safetyRules', () => {
    const config: RuntimeExecutionConfig = {
      nodeId: 'node-1',
      agent: {
        name: 'Test',
        model: 'anthropic/claude-sonnet-4-6',
        systemPrompt: 'Hello',
        tools: [],
      },
    };
    expect(config.safetyRules).toBeUndefined();
  });
});
