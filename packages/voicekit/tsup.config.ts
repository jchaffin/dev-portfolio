import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/server.ts',
    'src/adapters/openai.ts',
    'src/adapters/livekit.ts',
    'src/adapters/deepgram.ts',
    'src/adapters/elevenlabs.ts',
    'src/adapters/assemblyai.ts',
    'src/adapters/pipecat.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  external: [
    'react',
    'react-dom',
    'zod',
    '@openai/agents',
    'livekit-client',
    'livekit-server-sdk',
    '@deepgram/sdk',
  ],
});
