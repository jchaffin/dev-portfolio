import type { AgentConfig, ToolDefinition } from './types';
import type { VoiceAgentConfig } from './core/types';

/**
 * Create a voice agent config with simplified configuration.
 * Returns a plain object; the provider adapter converts it to the
 * provider-specific format at connection time.
 *
 * @example
 * ```ts
 * const agent = createAgent({
 *   name: 'Assistant',
 *   instructions: 'You are a helpful assistant.',
 *   tools: [weatherTool, navigationTool]
 * });
 * ```
 */
export function createAgent(config: AgentConfig): VoiceAgentConfig {
  const { name, instructions, tools = [], voice } = config;

  const fullInstructions = `
${instructions}

# Response Guidelines
- Keep responses concise (2-3 sentences max)
- Answer questions directly before asking follow-ups
- Use tools silently without announcing them
- Speak naturally and conversationally
`.trim();

  return {
    name,
    instructions: fullInstructions,
    tools,
    voice,
  };
}

/**
 * Create an agent using a structured template.
 *
 * @example
 * ```ts
 * const agent = createAgentFromTemplate({
 *   name: 'Support Bot',
 *   role: 'customer support agent for an e-commerce site',
 *   personality: 'Friendly, patient, solution-oriented',
 *   capabilities: ['Answer product questions', 'Help with order status'],
 *   tools: [orderTool, productTool]
 * });
 * ```
 */
export function createAgentFromTemplate(config: {
  name: string;
  role: string;
  personality?: string;
  capabilities?: string[];
  constraints?: string[];
  tools?: ToolDefinition[];
  context?: Record<string, unknown>;
}): VoiceAgentConfig {
  const {
    name,
    role,
    personality = 'Professional and helpful',
    capabilities = [],
    constraints = [],
    tools = [],
    context = {},
  } = config;

  const capabilitiesSection = capabilities.length > 0
    ? `## What You Can Do\n${capabilities.map(c => `- ${c}`).join('\n')}`
    : '';

  const constraintsSection = constraints.length > 0
    ? `## Constraints\n${constraints.map(c => `- ${c}`).join('\n')}`
    : '';

  const contextSection = Object.keys(context).length > 0
    ? `## Context\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``
    : '';

  const instructions = `
You are ${name}, ${role}.

## Personality
${personality}

${capabilitiesSection}

${constraintsSection}

${contextSection}
`.trim();

  return createAgent({
    name,
    instructions,
    tools,
  });
}
