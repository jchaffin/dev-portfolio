// lib/load-embedder.ts
export async function loadEmbedder() {
  if (typeof window === 'undefined') return null;
  (globalThis as any).process ??= { env: {} }; // shim
  const { pipeline, env } = await import('@xenova/transformers');
  env.useBrowserCache = true; // optional
  return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
}