# @jchaffin/voicekit

A provider-agnostic React library for building voice-enabled AI agents. Swap between OpenAI Realtime, LiveKit, Deepgram, and ElevenLabs without changing your application code.

## Installation

```bash
npm install @jchaffin/voicekit
```

Install the peer dependency for your chosen provider:

| Provider | Peer Dependency |
|----------|----------------|
| OpenAI Realtime | `@openai/agents` |
| LiveKit | `livekit-client` (client) / `livekit-server-sdk` (server) |
| Deepgram | `@deepgram/sdk` |
| ElevenLabs | _(none — uses WebSocket API directly)_ |

## Quick Start

### 1. Create a session endpoint

```ts
// app/api/session/route.ts
import { openaiServer } from '@jchaffin/voicekit/openai';

const server = openaiServer();
export const POST = server.createSessionHandler();
```

### 2. Define your agent and tools

```tsx
import { createAgent, defineTool } from '@jchaffin/voicekit';

const weatherTool = defineTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: {
    location: { type: 'string', description: 'City name' },
  },
  required: ['location'],
  execute: async ({ location }) => {
    const res = await fetch(`/api/weather?city=${location}`);
    return res.json();
  },
});

const agent = createAgent({
  name: 'Assistant',
  instructions: 'You are a helpful voice assistant.',
  tools: [weatherTool],
});
```

### 3. Wrap your app with VoiceProvider

```tsx
import { VoiceProvider } from '@jchaffin/voicekit';
import { openai } from '@jchaffin/voicekit/openai';

function App() {
  return (
    <VoiceProvider adapter={openai()} agent={agent}>
      <YourApp />
    </VoiceProvider>
  );
}
```

### 4. Use the useVoice hook

```tsx
import { useVoice } from '@jchaffin/voicekit';

function VoiceChat() {
  const { status, connect, disconnect, transcript, sendMessage } = useVoice();

  return (
    <div>
      <button onClick={status === 'CONNECTED' ? disconnect : connect}>
        {status === 'CONNECTED' ? 'End Call' : 'Start Call'}
      </button>
      <div>
        {transcript.map(msg => (
          <p key={msg.id}>
            <strong>{msg.role}:</strong> {msg.text}
          </p>
        ))}
      </div>
    </div>
  );
}
```

## Adapters

Each adapter normalizes its provider's API into the same `VoiceSession` interface, so your components and hooks work identically regardless of backend.

### OpenAI Realtime

```tsx
import { openai } from '@jchaffin/voicekit/openai';

<VoiceProvider adapter={openai({ model: 'gpt-realtime', codec: 'opus' })} agent={agent}>
```

Server:

```ts
import { openaiServer } from '@jchaffin/voicekit/openai';
const server = openaiServer({ model: 'gpt-realtime', voice: 'alloy' });
export const POST = server.createSessionHandler();
```

### LiveKit

```tsx
import { livekit } from '@jchaffin/voicekit/livekit';

<VoiceProvider adapter={livekit({ serverUrl: 'wss://my-app.livekit.cloud' })} agent={agent}>
```

Server:

```ts
import { livekitServer } from '@jchaffin/voicekit/livekit';
const server = livekitServer({ roomName: 'voice-room' });
export const POST = server.createSessionHandler();
```

### Deepgram

Deepgram provides STT/TTS but not a full conversational socket. This adapter streams mic audio to your backend agent WebSocket, which orchestrates Deepgram STT + your LLM + TTS.

```tsx
import { deepgram } from '@jchaffin/voicekit/deepgram';

<VoiceProvider adapter={deepgram({ agentUrl: 'wss://my-backend/agent' })} agent={agent}>
```

### ElevenLabs

```tsx
import { elevenlabs } from '@jchaffin/voicekit/elevenlabs';

<VoiceProvider adapter={elevenlabs({ agentId: 'your-agent-id' })} agent={agent}>
```

Server:

```ts
import { elevenlabsServer } from '@jchaffin/voicekit/elevenlabs';
const server = elevenlabsServer({ agentId: 'your-agent-id' });
export const POST = server.createSessionHandler();
```

## UI Components

### Drop-in `<VoiceChat>`

```tsx
import { VoiceProvider, VoiceChat } from '@jchaffin/voicekit';
import { openai } from '@jchaffin/voicekit/openai';

<VoiceProvider adapter={openai()} agent={agent}>
  <VoiceChat height="400px" />
</VoiceProvider>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `string` | `'400px'` | Chat area height |
| `showHeader` | `boolean` | `true` | Show status header |
| `showInput` | `boolean` | `true` | Show text input |
| `emptyState` | `ReactNode` | — | Custom empty state |
| `header` | `ReactNode` | — | Custom header |
| `footer` | `ReactNode` | — | Custom footer |

### Individual Components

```tsx
import { Transcript, StatusIndicator, ConnectButton, ChatInput } from '@jchaffin/voicekit';

<StatusIndicator />
<Transcript messages={transcript} />
<ConnectButton connectText="Start Call" disconnectText="End Call" />
<ChatInput placeholder="Say something..." />
```

## Hooks

### `useVoice()`

Primary hook for voice interaction. Must be inside a `<VoiceProvider>`.

```ts
const {
  status,          // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'
  connect,         // () => Promise<void>
  disconnect,      // () => Promise<void>
  transcript,      // TranscriptMessage[]
  clearTranscript, // () => void
  sendMessage,     // (text: string) => void
  interrupt,       // () => void
  mute,            // (muted: boolean) => void
  isMuted,         // boolean
  agent,           // VoiceAgentConfig
} = useVoice();
```

### `useRealtimeSession()`

Lower-level hook for direct session control with the adapter pattern. Used when you need more control than `useVoice()` provides (push-to-talk, raw events, etc.).

```ts
const {
  status, connect, disconnect,
  sendUserText, sendEvent,
  mute, interrupt,
  pushToTalkStart, pushToTalkStop,
} = useRealtimeSession({
  onConnectionChange: (status) => {},
  onAgentHandoff: (agentName) => {},
});
```

### `useToolResult(toolName)`

```tsx
const { result, input, hasResult, clear } = useToolResult('get_weather');
```

### `useToolListener(toolName, handler)`

```tsx
useToolListener('get_weather', (input, result) => {
  console.log('Weather:', result);
});
```

### `useToolResults()`

```tsx
const { results, lastResult, clear } = useToolResults();
```

### `useAudioRecorder()`

Record audio from a MediaStream and export as WAV.

```tsx
const { startRecording, stopRecording, downloadRecording, getRecordingBlob, clearRecording } = useAudioRecorder();
```

### `useSessionHistory()`

Manages transcript state for the advanced `useRealtimeSession` flow — handles deltas, completions, barge-in truncation, and guardrail results.

## Tool Builders

### `defineTool(config)`

```ts
const tool = defineTool({
  name: 'tool_name',
  description: 'What the tool does',
  parameters: {
    param1: { type: 'string', description: 'Description' },
    param2: { type: 'number', default: 10 },
  },
  required: ['param1'],
  execute: async ({ param1, param2 }) => ({ success: true }),
});
```

### `createNavigationTool(sections)`

```ts
const navTool = createNavigationTool(['about', 'projects', 'contact']);
```

### `createAPITool(config)`

```ts
const searchTool = createAPITool({
  name: 'search',
  description: 'Search the database',
  parameters: { query: { type: 'string' } },
  required: ['query'],
  endpoint: '/api/search',
  method: 'POST',
});
```

### `createEventTool(config)`

```ts
const modalTool = createEventTool({
  name: 'show_modal',
  description: 'Show a modal',
  parameters: { title: { type: 'string' } },
  eventType: 'voice:show-modal',
});
```

### `createSearchTool(config)` / `createRAGTool(config)`

```ts
const ragTool = createRAGTool({
  name: 'search_codebase',
  description: 'Search the codebase',
  endpoint: '/api/rag',
});
```

## Suggestions (User-in-the-Loop)

Tools can emit interactive suggestion chips that render in the UI. When a user clicks one, a message is sent back to the agent.

```tsx
import { SuggestionProvider, SuggestionChips, emitSuggestions, useSuggestions } from '@jchaffin/voicekit';

// In a tool's execute function:
emitSuggestions({
  type: 'project',
  prompt: 'Projects:',
  items: [
    { id: 'foo', label: 'Foo', message: 'Tell me about Foo' },
    { id: 'bar', label: 'Bar', message: 'Tell me about Bar' },
  ],
});

// In your component tree:
<SuggestionProvider onSelect={(item) => sendMessage(item.message)}>
  <SuggestionChips />
</SuggestionProvider>
```

## Guardrails

```ts
import { createModerationGuardrail, createCustomGuardrail } from '@jchaffin/voicekit';

const modGuardrail = createModerationGuardrail({ companyName: 'Acme' });

const customGuardrail = createCustomGuardrail('pii_check', async (output) => ({
  triggered: /\b\d{3}-\d{2}-\d{4}\b/.test(output),
  info: { reason: 'Contains SSN pattern' },
}));
```

## Contexts

For advanced usage, the library exposes `TranscriptProvider`, `EventProvider`, and `SuggestionProvider` as standalone context providers. These are used internally by `useRealtimeSession` and `useSessionHistory`.

```tsx
import { EventProvider, TranscriptProvider, SuggestionProvider } from '@jchaffin/voicekit';

<EventProvider>
  <TranscriptProvider>
    <SuggestionProvider>
      <App />
    </SuggestionProvider>
  </TranscriptProvider>
</EventProvider>
```

## Server Utilities

Legacy OpenAI-specific helpers (also available via `@jchaffin/voicekit/openai`):

```ts
import { createSessionHandler, getEphemeralKey, handleOptions } from '@jchaffin/voicekit/server';

// Next.js App Router
export const POST = createSessionHandler({ model: 'gpt-realtime', voice: 'alloy' });
export function OPTIONS() { return handleOptions(); }

// Express / custom
const { ephemeralKey, error } = await getEphemeralKey();
```

## Architecture

```
@jchaffin/voicekit
├── Core types (VoiceAdapter, VoiceSession, SessionEvents)
├── Adapters (openai, livekit, deepgram, elevenlabs)
├── React Provider (VoiceProvider + useVoice)
├── Hooks (useRealtimeSession, useSessionHistory, useAudioRecorder, tool hooks)
├── UI Components (VoiceChat, Transcript, ConnectButton, ChatInput, StatusIndicator)
├── Tool system (defineTool, createAPITool, createSearchTool, etc.)
├── Suggestions (SuggestionProvider, SuggestionChips, emitSuggestions)
├── Guardrails (moderation, custom classifiers)
├── Contexts (TranscriptProvider, EventProvider)
└── Server helpers (session handlers per provider)
```

## License

MIT
