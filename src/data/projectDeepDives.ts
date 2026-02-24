export interface ProjectDeepDive {
  title: string;
  body: string;
}

/** Key by project images path segment, e.g. "prosodyai" from "/projects/prosodyai" */
export const PROJECT_DEEP_DIVES: Record<string, ProjectDeepDive> = {
  prosodyai: {
    title: 'Prosody.ai — Architecture & pipeline',
    body: `ProsodyAI is prosody intelligence infrastructure that runs parallel to your ASR. An SSM-based model (Mamba/S4D) extracts 32-dim prosodic features (F0, energy, jitter, shimmer, HNR, MFCCs, spectral centroid, speech rate, pause duration) and streams per-utterance emotion, valence-arousal-dominance (VAD), and vertical-specific state. A causal GRU (ConversationPredictor) consumes these outputs and predicts session-level outcomes at every timestep: escalation risk, predicted CSAT, churn probability, and recommended tone (empathetic, calm, enthusiastic, etc.). Confidence scales with sequence length. The management plane (ProsodyCRM) provides API keys, transcript analysis, outcome feedback loop, LoRA fine-tuning on GCP, and Kafka event orchestration. REST and WebSocket APIs with Python and JavaScript SDKs; sub-200ms p99, 800+ QPS per node.`,
  },
};

export function getDeepDiveKey(imagesPath: string): string | null {
  if (!imagesPath) return null;
  const match = imagesPath.match(/\/projects\/([^/]+)/);
  return match ? match[1] : null;
}
