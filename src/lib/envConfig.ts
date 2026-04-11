import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
const isDev = process.env.NODE_ENV !== 'production';
// Loaded on import (e.g. `layout.tsx`) and when routes call `envConfig()`.
loadEnvConfig(projectDir, isDev);

/** Fallback when `PINECONE_INDEX` / `PINECONE_INDEX_NAME` unset (align with @jchaffin/gh-rag CLI default name). */
export const DEFAULT_PINECONE_INDEX = 'repo-chunks';

/**
 * Pinecone index for RAG / knowledge — set `PINECONE_INDEX` (preferred) or `PINECONE_INDEX_NAME`.
 */
export function getPineconeIndexName(): string {
  const name =
    process.env.PINECONE_INDEX?.trim() || process.env.PINECONE_INDEX_NAME?.trim();
  return name || DEFAULT_PINECONE_INDEX;
}

/**
 * Postgres URL for Prisma — `DATABASE_URL` is standard; others are aliases seen on Vercel/Neon.
 */
export function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.PRISMA_DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRESQL_URI?.trim();
  if (!url) {
    throw new Error('Set DATABASE_URL (or PRISMA_DATABASE_URL / POSTGRES_URL / POSTGRESQL_URI)');
  }
  return url;
}

/**
 * Loads `.env*` into `process.env` for local dev; on Vercel, env is injected — no-op impact.
 */
export function envConfig(dir: string = projectDir) {
  loadEnvConfig(dir, isDev);
}
