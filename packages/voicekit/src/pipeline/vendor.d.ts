// Ambient declarations for optional pipeline peer dependencies.
// These allow TypeScript to compile provider files even when the
// peer dependency is not installed.

declare module '@cartesia/cartesia-js' {
  interface CartesiaOptions {
    apiKey: string;
  }
  interface TTSContext {
    push(input: { transcript: string }): Promise<void>;
    no_more_inputs(): Promise<void>;
    receive(): AsyncIterable<{ type: string; audio?: ArrayBuffer | { buffer: ArrayBuffer }; done?: boolean }>;
  }
  interface TTSWebSocket {
    context(config: Record<string, unknown>): TTSContext;
    close(): void;
  }
  interface TTS {
    websocket(): Promise<TTSWebSocket>;
  }
  class Cartesia {
    constructor(options: CartesiaOptions);
    tts: TTS;
  }
  export default Cartesia;
}

declare module '@elevenlabs/elevenlabs-js' {
  interface ElevenLabsClientOptions {
    apiKey: string;
  }
  interface TextToSpeechStream {
    stream(voiceId: string, options: Record<string, unknown>): Promise<AsyncIterable<Uint8Array>>;
  }
  export class ElevenLabsClient {
    constructor(options: ElevenLabsClientOptions);
    textToSpeech: TextToSpeechStream;
  }
}

declare module 'assemblyai' {
  interface AssemblyAIOptions {
    apiKey: string;
  }
  interface TemporaryToken {
    token: string;
  }
  interface Streaming {
    createTemporaryToken(options: { expires_in_seconds: number }): Promise<TemporaryToken>;
  }
  export class AssemblyAI {
    constructor(options: AssemblyAIOptions);
    streaming: Streaming;
  }
  export class StreamingTranscriber {
    constructor(options: Record<string, unknown>);
    on(event: string, handler: (...args: any[]) => void): void;
    connect(): Promise<void>;
    sendAudio(data: Buffer | ArrayBuffer): void;
    stream(): WritableStream;
    close(): void;
  }
}

declare module '@deepgram/sdk' {
  interface DeepgramClientOptions {
    key: string;
  }
  interface LiveConnection {
    on(event: string, handler: (...args: any[]) => void): void;
    send(data: Buffer | ArrayBuffer): void;
    requestClose(): void;
  }
  interface ListenLive {
    live(options: Record<string, unknown>): LiveConnection;
  }
  export class DeepgramClient {
    constructor(options?: DeepgramClientOptions);
    listen: ListenLive;
  }
}
