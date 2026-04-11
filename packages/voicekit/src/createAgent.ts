import type { AgentConfig, ToolDefinition } from './types';
import type { VoiceAgentConfig, ToolMiddleware } from './core/types';

// ============================================================================
// createAgent — simple functional API
// ============================================================================

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

// ============================================================================
// createAgentFromTemplate — structured template
// ============================================================================

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

// ============================================================================
// AgentBuilder — fluent chainable API
//
// Assembles structured instructions from parts so you never write raw
// prompt XML. Call .build() to compile everything into a VoiceAgentConfig.
// ============================================================================

export class AgentBuilder {
  private _name: string;
  private _role = '';
  private _rules: string[] = [];
  private _context: Record<string, unknown> = {};
  private _flow: string[] = [];
  private _style: string[] = [];
  private _toolHints: Record<string, string> = {};
  private _sections: { heading: string; body: string }[] = [];
  private _rawInstructions = '';
  private _tools: ToolDefinition[] = [];
  private _handoffs: VoiceAgentConfig[] = [];
  private _middleware: ToolMiddleware[] = [];
  private _voice?: string;
  private _greeting?: string | false;
  private _turnDetection?: 'server_vad' | 'push_to_talk' | 'none';
  private _onConnect?: () => void | Promise<void>;
  private _onDisconnect?: () => void | Promise<void>;
  private _inputAudio?: Partial<import('./core/types').AudioFormat>;
  private _outputAudio?: Partial<import('./core/types').AudioFormat>;

  constructor(name: string) {
    this._name = name;
  }

  /** Set the agent's role/persona. */
  role(text: string): this { this._role = text; return this; }

  /** Add rules the agent must follow. */
  rules(...items: string[]): this { this._rules.push(...items); return this; }

  /** Add key-value context (injected as structured data the model can reference). */
  context(data: Record<string, unknown>): this { Object.assign(this._context, data); return this; }

  /** Define conversation flow steps. */
  flow(...steps: string[]): this { this._flow.push(...steps); return this; }

  /** Set answer style guidelines. */
  style(...items: string[]): this { this._style.push(...items); return this; }

  /** Add a tool hint — short guidance on when to use a specific tool. */
  toolHint(toolName: string, hint: string): this { this._toolHints[toolName] = hint; return this; }

  /** Add a custom named section to the instructions. */
  section(heading: string, body: string): this { this._sections.push({ heading, body }); return this; }

  /** Set raw instructions (overrides structured assembly). */
  instructions(text: string): this { this._rawInstructions = text; return this; }

  voice(voiceId: string): this { this._voice = voiceId; return this; }

  tool(t: ToolDefinition): this { this._tools.push(t); return this; }
  tools(t: ToolDefinition[]): this { this._tools.push(...t); return this; }

  handoff(a: VoiceAgentConfig): this { this._handoffs.push(a); return this; }
  handoffs(a: VoiceAgentConfig[]): this { this._handoffs.push(...a); return this; }

  middleware(mw: ToolMiddleware): this { this._middleware.push(mw); return this; }

  greeting(text: string | false): this { this._greeting = text; return this; }
  turnDetection(mode: 'server_vad' | 'push_to_talk' | 'none'): this { this._turnDetection = mode; return this; }

  onConnect(handler: () => void | Promise<void>): this { this._onConnect = handler; return this; }
  onDisconnect(handler: () => void | Promise<void>): this { this._onDisconnect = handler; return this; }

  inputAudio(format: Partial<import('./core/types').AudioFormat>): this { this._inputAudio = format; return this; }
  outputAudio(format: Partial<import('./core/types').AudioFormat>): this { this._outputAudio = format; return this; }

  /** Compile all parts into a VoiceAgentConfig. */
  build(): VoiceAgentConfig {
    const instructions = this._rawInstructions || this.compileInstructions();
    if (!instructions) {
      throw new Error(`AgentBuilder: provide role/rules/instructions for agent "${this._name}"`);
    }

    return {
      name: this._name,
      instructions,
      tools: this._tools.length > 0 ? this._tools : undefined,
      voice: this._voice,
      handoffs: this._handoffs.length > 0 ? this._handoffs : undefined,
      toolMiddleware: this._middleware.length > 0 ? this._middleware : undefined,
      greeting: this._greeting,
      turnDetection: this._turnDetection,
      onConnect: this._onConnect,
      onDisconnect: this._onDisconnect,
      inputAudioFormat: this._inputAudio,
      outputAudioFormat: this._outputAudio,
    };
  }

  private compileInstructions(): string {
    const parts: string[] = [];

    if (this._role) {
      parts.push(this._role);
    }

    if (this._rules.length > 0) {
      parts.push(this._rules.map((r, i) => `${i + 1}. ${r}`).join('\n'));
    }

    if (this._flow.length > 0) {
      parts.push(this._flow.join('\n'));
    }

    if (Object.keys(this._toolHints).length > 0) {
      const hints = Object.entries(this._toolHints)
        .map(([name, hint]) => `- ${name}: ${hint}`)
        .join('\n');
      parts.push(hints);
    }

    if (this._style.length > 0) {
      parts.push(this._style.map(s => `- ${s}`).join('\n'));
    }

    if (Object.keys(this._context).length > 0) {
      const lines = Object.entries(this._context).map(([k, v]) => {
        const val = Array.isArray(v) ? v.join(', ') : String(v);
        return `${k}: ${val}`;
      });
      parts.push(lines.join('\n'));
    }

    for (const s of this._sections) {
      parts.push(`## ${s.heading}\n${s.body}`);
    }

    return parts.join('\n\n');
  }
}

export function agent(name: string): AgentBuilder {
  return new AgentBuilder(name);
}

// ============================================================================
// Middleware helpers
// ============================================================================

export function loggingMiddleware(): ToolMiddleware {
  return async (toolName, params, next) => {
    const start = Date.now();
    console.log(`[voicekit] tool:${toolName} start`, params);
    try {
      const result = await next(params);
      console.log(`[voicekit] tool:${toolName} end (${Date.now() - start}ms)`, result);
      return result;
    } catch (err) {
      console.error(`[voicekit] tool:${toolName} error (${Date.now() - start}ms)`, err);
      throw err;
    }
  };
}

export function rateLimitMiddleware(maxCallsPerMinute: number): ToolMiddleware {
  const calls: number[] = [];
  return async (toolName, params, next) => {
    const now = Date.now();
    const windowStart = now - 60_000;
    while (calls.length > 0 && calls[0] < windowStart) calls.shift();
    if (calls.length >= maxCallsPerMinute) {
      return { success: false, error: `Rate limit exceeded for tool ${toolName}` };
    }
    calls.push(now);
    return next(params);
  };
}

export function retryMiddleware(maxRetries = 2, delayMs = 500): ToolMiddleware {
  return async (toolName, params, next) => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await next(params);
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
        }
      }
    }
    throw lastError;
  };
}

export function timeoutMiddleware(ms: number): ToolMiddleware {
  return async (_toolName, params, next) => {
    return Promise.race([
      next(params),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool timed out after ${ms}ms`)), ms)
      ),
    ]);
  };
}
