import { loadEnvConfig } from '@next/env'

/** Default Pinecone index name (matches @jchaffin/gh-rag / jobs/ingest when env is unset). */
export const DEFAULT_PINECONE_INDEX = 'repo-chunks'

/**
 * Loads environment variables from .env files into process.env.
 * @param {string} [dir=process.cwd()] - The directory to load .env files from.
 */
export function envConfig(dir: string = process.cwd()) {
  loadEnvConfig(dir, process.env.NODE_ENV !== 'production')
} 