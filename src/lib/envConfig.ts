import { loadEnvConfig } from '@next/env'

/**
 * Loads environment variables from .env files into process.env.
 * @param {string} [dir=process.cwd()] - The directory to load .env files from.
 */
export function envConfig(dir: string = process.cwd()) {
  loadEnvConfig(dir)
} 