# @jchaffin/voicekit

A React library for building voice-enabled AI agents using OpenAI's Realtime API.

## Installation

```bash
npm install @jchaffin/voicekit @openai/agents
```

## Quick Start

### 1. Create a session endpoint

```ts
// app/api/session/route.ts
import { createSessionHandler } from '@jchaffin/voicekit/server';

export const POST = createSessionHandler();

// Or with options:
export const POST = createSessionHandler({
  model: 'gpt-realtime',
  voice: 'alloy'
});
```

### 2. Define your agent

```tsx
import { createAgent, defineTool } from '@jchaffin/voicekit';

// Define tools
const weatherTool = defineTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: {
    location: { type: 'string', description: 'City name' }
  },
  required: ['location'],
  execute: async ({ location }) => {
    const res = await fetch(`/api/weather?city=${location}`);
    return res.json();
  }
});

// Create agent
const agent = createAgent({
  name: 'Assistant',
  instructions: `
    You are a helpful voice assistant.
    Help users check the weather and answer questions.
  `,
  tools: [weatherTool]
});
```

### 3. Wrap your app with VoiceProvider

```tsx
import { VoiceProvider } from '@jchaffin/voicekit';

function App() {
  return (
    <VoiceProvider agent={agent}>
      <YourApp />
    </VoiceProvider>
  );
}
```

### 4. Use the useVoice hook

```tsx
import { useVoice } from '@jchaffin/voicekit';

function VoiceChat() {
  const { 
    status, 
    connect, 
    disconnect, 
    transcript, 
    sendMessage 
  } = useVoice();

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
      
      <input 
        type="text"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            sendMessage(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        placeholder="Type a message..."
      />
    </div>
  );
}
```

## API Reference

### UI Components

#### `<VoiceChat>`

Complete voice chat interface - drop in and go.

```tsx
import { VoiceProvider, VoiceChat, createAgent } from '@jchaffin/voicekit';

const agent = createAgent({ name: 'Bot', instructions: 'Be helpful' });

function App() {
  return (
    <VoiceProvider agent={agent}>
      <VoiceChat height="400px" />
    </VoiceProvider>
  );
}
```

Props:
- `height` - Chat area height (default: `'400px'`)
- `showHeader` - Show status header (default: `true`)
- `showInput` - Show text input (default: `true`)
- `emptyState` - Custom empty state content
- `header` - Custom header content
- `footer` - Custom footer content

#### Individual Components

```tsx
import { 
  Transcript,      // Message list
  StatusIndicator, // Connection status dot
  ConnectButton,   // Start/end button  
  ChatInput        // Text input
} from '@jchaffin/voicekit';

// Use within VoiceProvider
<StatusIndicator />
<Transcript messages={transcript} />
<ConnectButton connectText="Start Call" disconnectText="End Call" />
<ChatInput placeholder="Say something..." />
```

### Core Components

#### `<VoiceProvider>`

Wraps your app to provide voice functionality.

```tsx
<VoiceProvider 
  agent={agent}
  sessionEndpoint="/api/session"  // Optional, defaults to /api/session
  model="gpt-4o-realtime-preview" // Optional
  language="en"                    // Optional
  onStatusChange={(status) => {}}  // Optional
  onTranscriptUpdate={(msgs) => {}} // Optional
  onToolCall={(name, input, result) => {}} // Optional
  onError={(error) => {}}          // Optional
>
  {children}
</VoiceProvider>
```

### Hooks

#### `useVoice()`

Main hook for voice interaction.

```ts
const {
  status,        // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'
  connect,       // () => Promise<void>
  disconnect,    // () => Promise<void>
  transcript,    // TranscriptMessage[]
  clearTranscript, // () => void
  sendMessage,   // (text: string) => void
  interrupt,     // () => void
  mute,          // (muted: boolean) => void
  isMuted,       // boolean
  agent,         // RealtimeAgent
} = useVoice();
```

#### `useToolResult(toolName)`

Listen for results from a specific tool.

```tsx
const { result, input, hasResult, clear } = useToolResult('get_weather');
```

#### `useToolListener(toolName, handler)`

Register a callback for tool results.

```tsx
useToolListener('get_weather', (input, result) => {
  console.log('Weather:', result);
});
```

#### `useToolResults()`

Get all tool results.

```tsx
const { results, lastResult, clear } = useToolResults();
```

### Tool Builders

#### `defineTool(config)`

Create a tool with type inference.

```ts
const tool = defineTool({
  name: 'tool_name',
  description: 'What the tool does',
  parameters: {
    param1: { type: 'string', description: 'Description' },
    param2: { type: 'number', default: 10 }
  },
  required: ['param1'],
  execute: async ({ param1, param2 }) => {
    // Implementation
    return { success: true };
  }
});
```

#### `createNavigationTool(sections)`

Create a tool for single-page app navigation.

```ts
const navTool = createNavigationTool(['about', 'projects', 'contact']);
```

#### `createAPITool(config)`

Create a tool that calls an API endpoint.

```ts
const searchTool = createAPITool({
  name: 'search',
  description: 'Search the database',
  parameters: { query: { type: 'string' } },
  required: ['query'],
  endpoint: '/api/search',
  method: 'POST'
});
```

#### `createEventTool(config)`

Create a tool that dispatches DOM events for UI updates.

```ts
const modalTool = createEventTool({
  name: 'show_modal',
  description: 'Show a modal',
  parameters: { title: { type: 'string' } },
  eventType: 'voice:show-modal'
});
```

### Agent Builders

#### `createAgent(config)`

Create a voice agent.

```ts
const agent = createAgent({
  name: 'Assistant',
  instructions: 'You are helpful.',
  tools: [tool1, tool2]
});
```

#### `createAgentFromTemplate(config)`

Create an agent using structured templates.

```ts
const agent = createAgentFromTemplate({
  name: 'Support Bot',
  role: 'customer support agent',
  personality: 'Friendly and helpful',
  capabilities: ['Answer questions', 'Track orders'],
  constraints: ['Never share private data'],
  tools: [orderTool]
});
```

## Server API

Import from `@jchaffin/voicekit/server` for server-side utilities.

### `createSessionHandler(config?)`

Creates a request handler for Next.js App Router or similar frameworks.

```ts
import { createSessionHandler } from '@jchaffin/voicekit/server';

// Basic
export const POST = createSessionHandler();

// With config
export const POST = createSessionHandler({
  apiKey: process.env.CUSTOM_KEY,  // defaults to OPENAI_API_KEY
  model: 'gpt-realtime',
  voice: 'alloy'
});
```

### `getEphemeralKey(config?)`

Get an ephemeral key directly (for Express, Fastify, etc.)

```ts
import { getEphemeralKey } from '@jchaffin/voicekit/server';

app.post('/api/session', async (req, res) => {
  const result = await getEphemeralKey();
  if (result.error) {
    return res.status(500).json({ error: result.error });
  }
  res.json({ ephemeralKey: result.ephemeralKey });
});
```

### `handleOptions()` / `corsHeaders()`

CORS helpers for preflight requests.

```ts
import { handleOptions, corsHeaders } from '@jchaffin/voicekit/server';

export function OPTIONS() {
  return handleOptions();
}
```

## License

MIT
