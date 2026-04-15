/**
 * OpenAI-compatible LLM provider.
 *
 * One class covers every provider that implements the `/v1/chat/completions` endpoint:
 * OpenAI, OpenRouter, Groq, Together AI, Fireworks, Cerebras, SambaNova.
 *
 * ```ts
 * const llm = openaiCompatibleLLM({
 *   baseURL: 'https://openrouter.ai/api/v1',
 *   apiKey: process.env.OPENROUTER_API_KEY,
 *   model: 'anthropic/claude-sonnet-4-20250514',
 * });
 * ```
 */

import type { LLMProvider, LLMStreamEvent, LLMConfig, ChatMessage, ToolDefinition } from '../types';

export interface OpenAICompatibleLLMOptions {
  /** Base URL for the API (no trailing slash). Default: https://api.openai.com/v1 */
  baseURL?: string;
  apiKey: string;
  /** Default model. Can be overridden per-call via LLMConfig. */
  model?: string;
  /** Default temperature */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
  /** Extra headers (e.g. OpenRouter HTTP-Referer, X-Title) */
  headers?: Record<string, string>;
  /** Organization ID (OpenAI-specific) */
  organization?: string;
}

const KNOWN_PROVIDERS: Record<string, { baseURL: string; defaultModel: string }> = {
  openai: { baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o' },
  groq: { baseURL: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
  together: { baseURL: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  fireworks: { baseURL: 'https://api.fireworks.ai/inference/v1', defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct' },
  cerebras: { baseURL: 'https://api.cerebras.ai/v1', defaultModel: 'llama-3.3-70b' },
  sambanova: { baseURL: 'https://api.sambanova.ai/v1', defaultModel: 'Meta-Llama-3.3-70B-Instruct' },
};

class OpenAICompatibleLLMImpl implements LLMProvider {
  readonly name: string;
  private baseURL: string;
  private apiKey: string;
  private defaultModel: string;
  private defaultTemp: number;
  private defaultMaxTokens: number | undefined;
  private extraHeaders: Record<string, string>;

  constructor(options: OpenAICompatibleLLMOptions) {
    this.baseURL = (options.baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.defaultModel = options.model || 'gpt-4o';
    this.defaultTemp = options.temperature ?? 0.7;
    this.defaultMaxTokens = options.maxTokens;
    this.extraHeaders = {
      ...(options.organization && { 'OpenAI-Organization': options.organization }),
      ...options.headers,
    };

    const providerName = Object.entries(KNOWN_PROVIDERS).find(
      ([, v]) => this.baseURL.includes(new URL(v.baseURL).hostname),
    )?.[0];
    this.name = providerName ? `llm:${providerName}` : `llm:openai-compatible`;
  }

  async *stream(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    config?: LLMConfig,
  ): AsyncIterable<LLMStreamEvent> {
    const model = config?.model || this.defaultModel;
    const temperature = config?.temperature ?? this.defaultTemp;
    const maxTokens = config?.maxTokens ?? this.defaultMaxTokens;

    const allMessages = config?.systemPrompt
      ? [{ role: 'system' as const, content: config.systemPrompt }, ...messages]
      : messages;

    const body: Record<string, unknown> = {
      model,
      messages: allMessages,
      temperature,
      stream: true,
    };
    if (maxTokens) body.max_tokens = maxTokens;
    if (tools?.length) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...this.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`LLM API ${response.status}: ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    const toolCallAccum = new Map<number, { id: string; name: string; args: string }>();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            for (const tc of toolCallAccum.values()) {
              yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, arguments: tc.args } };
            }
            yield { type: 'done' };
            return;
          }

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              yield { type: 'delta', delta: delta.content };
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (tc.id) {
                  toolCallAccum.set(idx, { id: tc.id, name: tc.function?.name || '', args: '' });
                }
                const existing = toolCallAccum.get(idx);
                if (existing && tc.function?.arguments) {
                  existing.args += tc.function.arguments;
                  if (tc.function?.name) existing.name = tc.function.name;
                }
              }
            }

            if (chunk.choices?.[0]?.finish_reason) {
              for (const tc of toolCallAccum.values()) {
                yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, arguments: tc.args } };
              }
              const usage = chunk.usage
                ? { promptTokens: chunk.usage.prompt_tokens, completionTokens: chunk.usage.completion_tokens }
                : undefined;
              yield { type: 'done', usage };
              return;
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: 'done' };
  }
}

/**
 * Create an OpenAI-compatible LLM provider.
 *
 * Works with: OpenAI, OpenRouter, Groq, Together AI, Fireworks, Cerebras, SambaNova,
 * or any provider implementing the `/v1/chat/completions` endpoint.
 */
export function openaiCompatibleLLM(options: OpenAICompatibleLLMOptions): LLMProvider {
  return new OpenAICompatibleLLMImpl(options);
}

/** Shorthand: create a provider by known name. */
export function llmProvider(
  provider: keyof typeof KNOWN_PROVIDERS,
  apiKey: string,
  model?: string,
): LLMProvider {
  const p = KNOWN_PROVIDERS[provider];
  if (!p) throw new Error(`Unknown LLM provider: "${provider}". Use: ${Object.keys(KNOWN_PROVIDERS).join(', ')}`);
  return openaiCompatibleLLM({ baseURL: p.baseURL, apiKey, model: model || p.defaultModel });
}
