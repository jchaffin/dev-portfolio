import { NextRequest, NextResponse } from 'next/server';
import { envConfig } from '@/lib/envConfig';
import { createGhRag } from '@jchaffin/gh-rag';
import { Pinecone } from '@pinecone-database/pinecone';

/** Cron must not be statically cached; ingest can exceed default serverless timeout. */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface GhRepo {
  full_name: string;
  fork: boolean;
  archived: boolean;
  size: number;
}

async function listUserRepos(token: string): Promise<GhRepo[]> {
  const all: GhRepo[] = [];
  let page = 1;
  for (;;) {
    const url = new URL('https://api.github.com/user/repos');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('affiliation', 'owner');
    url.searchParams.set('visibility', 'all');

    const res = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) break;
    const batch = (await res.json()) as GhRepo[];
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return all.filter(r => !r.fork && !r.archived && r.size > 0);
}

export async function GET(request: NextRequest) {
  envConfig();

  // Same check as https://vercel.com/docs/cron-jobs#securing-cron-jobs
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  const openaiKey = process.env.OPENAI_API_KEY;
  const pineconeKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;

  if (!token || !openaiKey || !pineconeKey || !indexName) {
    return NextResponse.json({ error: 'Missing required env vars' }, { status: 500 });
  }

  try {
    const repos = await listUserRepos(token);
    console.log(`[cron/ingest] Found ${repos.length} repos to ingest`);

    const pinecone = new Pinecone({ apiKey: pineconeKey });
    const index = pinecone.index(indexName);

    const ghRag = createGhRag({
      openaiApiKey: openaiKey,
      githubToken: token,
      pine: { index },
    });

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const repo of repos) {
      try {
        const gitUrl = `https://github.com/${repo.full_name}.git`;
        await ghRag.ingest({ gitUrl });
        success++;
        console.log(`[cron/ingest] ✓ ${repo.full_name}`);
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${repo.full_name}: ${msg}`);
        console.error(`[cron/ingest] ✗ ${repo.full_name}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalRepos: repos.length,
      ingested: success,
      failed,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('[cron/ingest] Fatal error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
