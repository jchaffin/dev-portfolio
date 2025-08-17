import { meAgent } from './MeAgent';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  meAgent: [meAgent],
};

export const defaultAgentSetKey = 'meAgent';
