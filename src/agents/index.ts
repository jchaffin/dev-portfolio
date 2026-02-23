import { meAgent } from './MeAgent';

import type { VoiceAgentConfig } from '@jchaffin/voicekit';

export const allAgentSets: Record<string, VoiceAgentConfig[]> = {
  meAgent: [meAgent],
};

export const defaultAgentSetKey = 'meAgent';
