import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

// ============================================================================
// Client singleton (lazy — only connects when first used)
// ============================================================================

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.STORAGE_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.STORAGE_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  _redis = new Redis({ url, token });
  return _redis;
}

// ============================================================================
// Helpers
// ============================================================================

export function cacheKey(...parts: string[]): string {
  return parts.join(':');
}

export function hashKey(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

// ============================================================================
// JSON cache (for objects / API responses)
// ============================================================================

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const val = await redis.get<T>(key);
    return val ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // no-op
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(key);
  } catch {
    // no-op
  }
}

// ============================================================================
// Buffer cache (for binary data like screenshots)
// Upstash stores binary as base64 strings under the hood.
// ============================================================================

export async function cacheGetBuffer(key: string): Promise<Buffer | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const val = await redis.get<string>(key);
    if (!val) return null;
    return Buffer.from(val, 'base64');
  } catch {
    return null;
  }
}

export async function cacheSetBuffer(
  key: string,
  buf: Buffer,
  ttlSeconds: number
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.set(key, buf.toString('base64'), { ex: ttlSeconds });
  } catch {
    // no-op
  }
}
