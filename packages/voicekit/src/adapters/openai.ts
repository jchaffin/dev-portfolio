/**
 * OpenAI Realtime API adapter for VoiceKit.
 *
 * Usage:
 * ```ts
 * import { openai } from '@jchaffin/voicekit/openai';
 *
 * <VoiceProvider adapter={openai({ model: 'gpt-realtime' })} agent={agent}>
 * ```
 *
 * Peer dependency: @openai/agents (>= 0.0.15)
 */

import {
  RealtimeSession,
  RealtimeAgent,
  OpenAIRealtimeWebRTC,
  tool as sdkTool,
} from '@openai/agents/realtime';
import { EventEmitter } from '../core/EventEmitter';
import { emitToolResult } from '../tools';
import type {
  VoiceAdapter,
  VoiceSession,
  VoiceAgentConfig,
  SessionOptions,
  SessionEvents,
  ConnectConfig,
  ServerSessionConfig,
  ServerAdapter,
} from '../core/types';
import type { ToolDefinition } from '../types';
import type { ToolMiddleware } from '../core/types';

// ============================================================================
// Tool conversion: VoiceKit ToolDefinition -> OpenAI SDK tool
// ============================================================================

function applyMiddleware(
  toolName: string,
  execute: (input: unknown) => Promise<unknown> | unknown,
  middleware: ToolMiddleware[] | undefined,
): (input: unknown) => Promise<unknown> {
  if (!middleware?.length) return (input) => Promise.resolve(execute(input));
  return (input) =>
    middleware.reduceRight<(params: unknown) => Promise<unknown>>(
      (next, mw) => (params) => mw(toolName, params, next),
      (params) => Promise.resolve(execute(params)),
    )(input);
}

function convertTool(def: ToolDefinition, middleware?: ToolMiddleware[]) {
  const wrappedExecute = applyMiddleware(def.name, def.execute as (input: unknown) => unknown, middleware);
  return sdkTool({
    name: def.name,
    description: def.description,
    parameters: {
      type: 'object',
      properties: def.parameters.properties,
      required: def.parameters.required || [],
      additionalProperties: false,
    },
    execute: async (input: unknown) => {
      try {
        const result = await wrappedExecute(input);
        emitToolResult(def.name, input, result);
        return result;
      } catch (error) {
        const errorResult = { success: false, error: String(error) };
        emitToolResult(def.name, input, errorResult);
        return errorResult;
      }
    },
  });
}

// ============================================================================
// OpenAI Session
// ============================================================================

class OpenAISession
  extends EventEmitter<SessionEvents>
  implements VoiceSession
{
  private session: RealtimeSession | null = null;
  private agent: RealtimeAgent;
  private options: SessionOptions;
  private agentConfig: VoiceAgentConfig;
  private responseInFlight = false;

  constructor(agent: RealtimeAgent, options: SessionOptions, agentConfig: VoiceAgentConfig) {
    super();
    this.agent = agent;
    this.options = options;
    this.agentConfig = agentConfig;
  }

  async connect(config: ConnectConfig): Promise<void> {
    const audioElement = config.audioElement;

    this.session = new RealtimeSession(this.agent, {
      transport: new OpenAIRealtimeWebRTC({
        audioElement,
        ...(this.options.codec === 'g711' && {
          changePeerConnection: async (pc: RTCPeerConnection) => {
            pc.getTransceivers().forEach((transceiver) => {
              if (transceiver.sender.track?.kind === 'audio') {
                transceiver.setCodecPreferences([
                  { mimeType: 'audio/PCMU', clockRate: 8000 },
                  { mimeType: 'audio/PCMA', clockRate: 8000 },
                ]);
              }
            });
            return pc;
          },
        }),
      }),
      model: (this.options.model as string) || 'gpt-realtime',
      config: {
        inputAudioFormat: this.options.codec === 'g711' ? 'g711_ulaw' : 'pcm16',
        outputAudioFormat: this.options.codec === 'g711' ? 'g711_ulaw' : 'pcm16',
        inputAudioTranscription: {
          model: (this.options.transcriptionModel as string) || 'gpt-4o-transcribe',
          language: (this.options.language as string) || 'en',
        },
      },
      outputGuardrails: (config.outputGuardrails ?? []) as any,
      context: config.context ?? {},
    });

    this.wireEvents(this.session);
    this.wireTransportDisconnect(this.session);
    await this.session.connect({ apiKey: config.authToken });
    this.agentConfig.onConnect?.();
    this.emit('status_change', 'CONNECTED');
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      try {
        this.session.close();
      } catch {
        // Ignore close errors
      }
      this.session = null;
    }
    this.agentConfig.onDisconnect?.();
    this.emit('status_change', 'DISCONNECTED');
    this.removeAllListeners();
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.session) throw new Error('Session not connected');

    if (this.responseInFlight) {
      this.session.interrupt();
      await new Promise<void>((resolve) => {
        const onDone = (event: Record<string, unknown>) => {
          if ((event as any).type === 'response.done' || (event as any).type === 'response.cancelled') {
            clearTimeout(timeoutId);
            this.off('raw_event', onDone as any);
            resolve();
          }
        };
        this.on('raw_event', onDone as any);
        const timeoutId = setTimeout(() => {
          this.off('raw_event', onDone as any);
          resolve();
        }, 1500);
      });
    }

    this.session.sendMessage(text);
  }

  interrupt(): void {
    this.session?.interrupt();
  }

  mute(muted: boolean): void {
    this.session?.mute(muted);
  }

  sendRawEvent(event: Record<string, unknown>): void {
    this.session?.transport.sendEvent(event as any);
  }

  /**
   * The SDK's RealtimeSession doesn't propagate transport-level connection
   * state changes. Listen directly on the transport so we detect drops
   * (ICE failure, server-side close, network loss) and surface them.
   */
  private wireTransportDisconnect(session: RealtimeSession): void {
    const transport = session.transport as any;
    if (typeof transport?.on !== 'function') return;

    transport.on('connection_change', (status: string) => {
      if (status === 'disconnected' && this.session === session) {
        this.session = null;
        this.agentConfig.onDisconnect?.();
        this.emit('error', new Error('Transport disconnected'));
        this.emit('status_change', 'DISCONNECTED');
        this.removeAllListeners();
      }
    });
  }

  // Map OpenAI SDK events -> normalized SessionEvents
  private wireEvents(session: RealtimeSession): void {
    session.on('transport_event', (event: Record<string, unknown>) => {
      const type = event.type as string;

      switch (type) {
        case 'input_audio_buffer.speech_started':
          this.emit('user_speech_started');
          break;

        case 'conversation.item.input_audio_transcription.delta':
          this.emit('user_transcript', {
            itemId: event.item_id as string,
            delta: (event.delta as string) || '',
            isFinal: false,
          });
          break;

        case 'conversation.item.input_audio_transcription.completed':
          this.emit('user_transcript', {
            itemId: event.item_id as string,
            text: (event.transcript as string) || '',
            isFinal: true,
          });
          break;

        case 'response.audio_transcript.delta':
        case 'response.output_audio_transcript.delta':
          this.emit('assistant_transcript', {
            itemId: event.item_id as string,
            delta: (event.delta as string) || '',
            isFinal: false,
          });
          break;

        case 'response.audio_transcript.done':
        case 'response.output_audio_transcript.done':
          this.emit('assistant_transcript', {
            itemId: event.item_id as string,
            text: (event.transcript as string) || '',
            isFinal: true,
          });
          break;

        case 'response.audio.delta':
        case 'response.output_audio.delta':
          this.emit('audio_delta', event.item_id as string, event.delta as string);
          break;

        case 'response.created':
          this.responseInFlight = true;
          this.emit('raw_event', event);
          break;

        case 'response.done':
          this.responseInFlight = false;
          this.emit('raw_event', event);
          break;

        case 'conversation.item.truncated':
          this.emit('raw_event', event);
          break;

        default:
          this.emit('raw_event', event);
          break;
      }
    });

    session.on('agent_tool_start', ((...args: unknown[]) => {
      const functionCall = args[2] as Record<string, unknown> | undefined;
      if (functionCall) {
        this.emit('tool_call_start', functionCall.name as string, functionCall.arguments);
      }
    }) as any);

    session.on('agent_tool_end', ((...args: unknown[]) => {
      const functionCall = args[2] as Record<string, unknown> | undefined;
      const result = args[3];
      if (functionCall) {
        this.emit('tool_call_end', functionCall.name as string, functionCall.arguments, result);
      }
    }) as any);

    session.on('agent_handoff', ((...args: unknown[]) => {
      const item = args[0] as Record<string, unknown>;
      const context = item?.context as Record<string, unknown>;
      const history = context?.history as Record<string, unknown>[];
      if (history?.length) {
        const lastMessage = history[history.length - 1];
        const agentName = ((lastMessage.name as string) || '').split('transfer_to_').pop() || '';
        this.emit('agent_handoff', '', agentName);
      }
    }) as any);

    session.on('guardrail_tripped', ((...args: unknown[]) => {
      this.emit('guardrail_tripped', args);
    }) as any);

    session.on('history_updated', ((...args: unknown[]) => {
      this.emit('raw_event', { type: 'history_updated', items: args[0] });
    }) as any);

    session.on('history_added', ((...args: unknown[]) => {
      this.emit('raw_event', { type: 'history_added', item: args[0] });
    }) as any);

    session.on('error', (error: unknown) => {
      if (error instanceof Error) {
        this.emit('error', error);
      } else if (error && typeof error === 'object') {
        const obj = error as Record<string, unknown>;
        const msg = (obj.message as string)
          || (obj.error as any)?.message
          || JSON.stringify(error);
        this.emit('error', new Error(msg));
      } else {
        this.emit('error', new Error(String(error)));
      }
    });
  }
}

// ============================================================================
// Adapter factory
// ============================================================================

export interface OpenAIAdapterOptions extends SessionOptions {
  model?: string;
  language?: string;
  codec?: string;
  voice?: string;
  transcriptionModel?: string;
}

/**
 * Create an OpenAI Realtime adapter.
 *
 * ```ts
 * import { openai } from '@jchaffin/voicekit/openai';
 * <VoiceProvider adapter={openai()} agent={agent} />
 * ```
 */
export function openai(options: OpenAIAdapterOptions = {}): VoiceAdapter {
  return {
    name: 'openai',

    createSession(agentConfig: VoiceAgentConfig, sessionOpts?: SessionOptions): VoiceSession {
      const merged: SessionOptions = { ...options, ...sessionOpts };
      const agent = buildRealtimeAgent(agentConfig);
      return new OpenAISession(agent, merged, agentConfig);
    },
  };
}

function buildRealtimeAgent(config: VoiceAgentConfig): RealtimeAgent {
  const tools = (config.tools || []).map((t) => convertTool(t, config.toolMiddleware));
  const handoffs = (config.handoffs || []).map(buildRealtimeAgent);
  return new RealtimeAgent({
    name: config.name,
    instructions: config.instructions,
    tools,
    ...(handoffs.length > 0 && { handoffs }),
  });
}

// ============================================================================
// Server adapter
// ============================================================================

export interface OpenAIServerConfig extends ServerSessionConfig {
  apiKey?: string;
  model?: string;
  voice?: string;
  instructions?: string;
  expiresIn?: number;
}

export function openaiServer(config: OpenAIServerConfig = {}): ServerAdapter {
  const getSessionToken = async (overrides: ServerSessionConfig = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = merged.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) return { error: 'OpenAI API key not configured' };

    try {
      const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires_after: {
            anchor: 'created_at',
            seconds: (merged.expiresIn as number) || 600,
          },
          session: {
            type: 'realtime',
            model: (merged.model as string) || 'gpt-realtime',
            ...(merged.voice && { audio: { output: { voice: merged.voice } } }),
            ...(merged.instructions && { instructions: merged.instructions }),
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('OpenAI client_secrets error:', text);
        return { error: `OpenAI API error: ${response.status}` };
      }

      const data = await response.json();
      if (!data.value) return { error: 'Invalid response from OpenAI' };
      return { token: data.value };
    } catch (err) {
      return { error: String(err) };
    }
  };

  return {
    getSessionToken,

    createSessionHandler(overrides?: ServerSessionConfig) {
      return async (_request?: Request): Promise<Response> => {
        const result = await getSessionToken(overrides);
        if (result.error) {
          return Response.json({ error: result.error }, { status: 500 });
        }
        return Response.json({ ephemeralKey: result.token });
      };
    },
  };
}

export default openai;
