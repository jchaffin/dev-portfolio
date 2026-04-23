import { NextRequest, NextResponse } from 'next/server';
import { envConfig, getPineconeIndexName } from '@/lib/envConfig';
import { createGhRag } from '@jchaffin/gh-rag';
import { Pinecone } from '@pinecone-database/pinecone';
import { cacheGet, cacheSet, cacheKey } from '@/lib/redis';

// Inflight deduplication stays in-memory (per-process, short-lived)
const inflight = new Map<string, Promise<any>>();
const RAG_TTL = 300; // 5 minutes

// Module-level singleton — keeps the lib's in-process embedCache (60 s) and
// searchCache (10 s) alive across requests so repeated queries skip the
// ~9 s embedding round-trip after the first hit.
let _ghRag: ReturnType<typeof createGhRag> | null = null;

function getGhRag() {
  if (_ghRag) return _ghRag;
  envConfig();
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(getPineconeIndexName());
  _ghRag = createGhRag({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    githubToken: process.env.GITHUB_TOKEN,
    pine: { index },
  });
  return _ghRag;
}

const makeKey = (repo: string, query: string, limit: number) =>
  cacheKey('rag', repo || 'all', query, String(limit));

/**
 * Pinecone namespace from a repo identifier.
 *
 * Ingest uses `owner/repo` as the namespace to avoid collisions across orgs
 * (e.g. ProsodyAI/api vs jchaffin/api). URLs are normalised to `owner/repo`;
 * plain `owner/repo` strings pass through unchanged.
 */
function pineconeNamespaceFromRepo(input: string | undefined | null): string | undefined {
  if (input == null) return undefined;
  const t = String(input).trim();
  if (!t) return undefined;
  const noGit = t.replace(/\.git$/i, '');
  // Full GitHub URL → owner/repo
  const fromUrl = noGit.match(/github\.com\/([^/]+\/[^/?#]+)/i);
  if (fromUrl?.[1]) return fromUrl[1].replace(/\.git$/i, '');
  if (/^https?:\/\//i.test(noGit)) {
    try {
      const parts = new URL(noGit).pathname.split('/').filter(Boolean);
      if (parts.length >= 2) return `${parts[0]}/${parts[1].replace(/\.git$/i, '')}`;
    } catch {
      /* ignore */
    }
  }
  // Already owner/repo or bare slug — keep as-is
  return noGit;
}

/** Pinecone may still hold legacy chunks; never surface dependency / build junk. */
function snippetPath(s: Record<string, unknown>): string {
  const p = s.path;
  if (typeof p === 'string') return p.replace(/\\/g, '/');
  const meta = s.metadata;
  if (meta && typeof meta === 'object' && typeof (meta as { path?: string }).path === 'string') {
    return (meta as { path: string }).path.replace(/\\/g, '/');
  }
  return '';
}

function isJunkSourcePath(filePath: string): boolean {
  if (!filePath) return false;
  const n = filePath.toLowerCase();
  const segs = [
    '/node_modules/',
    'node_modules/',
    '/.pnpm/',
    '/.yarn/',
    '/__pycache__/',
    '/.next/',
    '/.nuxt/',
    '/dist/',
    '/build/',
    '/out/',
    '/.git/',
    '/.turbo/',
    '/.cache/',
    '/coverage/',
    '/vendor/bundle/',
    '/.venv/',
    '/venv/',
  ];
  return segs.some((s) => n.includes(s));
}

function sanitizeRagPayload<T extends Record<string, unknown>>(data: T): T {
  const snippets = data.snippets;
  if (!Array.isArray(snippets)) return data;
  const filtered = snippets.filter((raw) => {
    if (!raw || typeof raw !== 'object') return false;
    const s = raw as Record<string, unknown>;
    return !isJunkSourcePath(snippetPath(s));
  });
  return {
    ...data,
    snippets: filtered,
    snippetsFound: filtered.length,
  } as T;
}

// Background ingestion job tracking
type IngestJob = {
  id: string;
  repo: string;
  gitUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  result?: { files: number; chunks: number; model: string; namespace: string };
  error?: string;
};
const ingestJobs = new Map<string, IngestJob>();

// Prevent duplicate ingests for the same repo
const ingestInflight = new Map<string, string>(); // repo -> jobId

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// PUT: Start background ingestion job
export async function PUT(request: NextRequest) {
  envConfig();

  try {
    const { repo, ref, fileGlobs, jobId } = await request.json();

    // If jobId provided, return status of existing job
    if (jobId) {
      const job = ingestJobs.get(jobId);
      if (!job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }
      const response = NextResponse.json({ success: true, job });
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }

    if (!repo) {
      return NextResponse.json(
        { success: false, error: 'repo is required (e.g., "owner/repo")' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Missing required API keys (OPENAI_API_KEY, PINECONE_API_KEY)',
      }, { status: 500 });
    }

    // Check if already ingesting this repo
    const existingJobId = ingestInflight.get(repo);
    if (existingJobId) {
      const existingJob = ingestJobs.get(existingJobId);
      if (existingJob && (existingJob.status === 'pending' || existingJob.status === 'running')) {
        const response = NextResponse.json({
          success: true,
          message: 'Ingestion already in progress',
          job: existingJob,
        });
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
      }
    }

    // Create new job
    const newJobId = `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const gitUrl = repo.startsWith('http') ? repo : `https://github.com/${repo}.git`;
    
    const job: IngestJob = {
      id: newJobId,
      repo,
      gitUrl,
      status: 'pending',
      startedAt: Date.now(),
    };
    ingestJobs.set(newJobId, job);
    ingestInflight.set(repo, newJobId);

    console.log(`🔧 RAG Ingest: Starting background job ${newJobId} for ${repo}`);

    // Start ingestion in background (don't await)
    (async () => {
      job.status = 'running';
      try {
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
        const indexName = getPineconeIndexName();
        const index = pinecone.index(indexName);

        const namespace = repo.includes('/') ? repo.replace(/\.git$/i, '') : undefined;
        const ghRag = createGhRag({
          openaiApiKey: process.env.OPENAI_API_KEY!,
          githubToken: process.env.GITHUB_TOKEN,
          pine: { index, namespace } as any,
        });

        const ingestOpts: { gitUrl: string; ref?: string; fileGlobs?: string[] } = { gitUrl };
        if (ref) ingestOpts.ref = ref;
        if (fileGlobs) ingestOpts.fileGlobs = fileGlobs;

        const result = await ghRag.ingest(ingestOpts);
        
        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = result;
        console.log(`🔧 RAG Ingest: Job ${newJobId} completed - ${result.files} files, ${result.chunks} chunks`);
      } catch (err) {
        job.status = 'failed';
        job.completedAt = Date.now();
        job.error = err instanceof Error ? err.message : 'Unknown error';
        console.error(`🔧 RAG Ingest: Job ${newJobId} failed:`, err);
      } finally {
        ingestInflight.delete(repo);
      }
    })();

    const response = NextResponse.json({
      success: true,
      message: 'Ingestion started in background',
      job,
    }, { status: 202 });
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;

  } catch (error) {
    console.error('🔧 RAG Ingest error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  envConfig();
  
  try {
    const { repo: repoBody, query, limit = 5, skill } = await request.json();

    const skillTrim = typeof skill === 'string' ? skill.trim() : '';

    // Validate input — either semantic `query` or multi-namespace `skill` discovery (findBySkill)
    if (!query && !skillTrim) {
      return NextResponse.json(
        { success: false, error: 'query or skill is required' },
        { status: 400 }
      );
    }

    // Validate required environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('🔧 RAG API: Missing OPENAI_API_KEY');
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured',
        fallback: 'RAG service unavailable - missing OpenAI API key'
      }, { status: 500 });
    }

    if (!process.env.PINECONE_API_KEY) {
      console.error('🔧 RAG API: Missing PINECONE_API_KEY');
      return NextResponse.json({
        success: false,
        error: 'Pinecone API key not configured',
        fallback: 'RAG service unavailable - missing Pinecone API key'
      }, { status: 500 });
    }

    const repoToSearch = pineconeNamespaceFromRepo(
      typeof repoBody === 'string' ? repoBody : undefined
    );
    const limitNum = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(80, Number(limit))) : 5;

    const ragKey = skillTrim
      ? makeKey(repoToSearch ?? 'all', `__skill__:${skillTrim}`, limitNum)
      : makeKey(repoToSearch ?? 'all', query as string, limitNum);

    if (process.env.DEBUG_RAG === '1') {
      console.log('[rag]', repoToSearch ?? 'all', skillTrim ? `skill:${skillTrim}` : query.slice(0, 120));
    }

    // Serve from Redis cache if fresh
    const cached = await cacheGet<any>(ragKey);
    if (cached) {
      return NextResponse.json({ ...sanitizeRagPayload(cached), cached: true });
    }

    // Deduplicate inflight for same key (in-memory, per-process)
    if (inflight.has(ragKey)) {
      const data = await inflight.get(ragKey)!;
      return NextResponse.json({ ...sanitizeRagPayload(data), deduped: true });
    }

    // Initialize Pinecone
    const ghRag = getGhRag();

    const p = (async () => {
      if (skillTrim) {
        // Queries every Pinecone namespace (per-repo vectors). hybridSearch without a repo only hits default NS.
        const skillLimit = Math.max(12, Math.min(60, limitNum * 3));
        let rows = await ghRag.findBySkill({ skill: skillTrim, limit: skillLimit });
        if (repoToSearch) {
          const ns = repoToSearch;
          rows = rows.filter(
            (r: { repo: string }) =>
              r.repo === ns ||
              r.repo.toLowerCase() === ns.toLowerCase() ||
              r.repo.endsWith(`/${ns}`)
          );
        }
        const snippets = rows.flatMap((r: { repo: string; techStack?: string[]; samplePaths?: string[]; score?: number }) => {
          const paths =
            Array.isArray(r.samplePaths) && r.samplePaths.length > 0 ? r.samplePaths.slice(0, 6) : [''];
          return paths.map((path: string) => ({
            repo: r.repo,
            path: path || undefined,
            text: path
              ? `Stack match (${skillTrim}): ${(r.techStack || []).slice(0, 12).join(', ')}`
              : `Repo match for ${skillTrim} (semantic + stack)`,
            techStack: r.techStack || [],
            score: r.score,
          }));
        });
        const data = sanitizeRagPayload({
          success: true,
          repo: repoToSearch ?? null,
          query: skillTrim,
          skillSearch: true,
          snippetsFound: snippets.length,
          snippets,
        });
        await cacheSet(ragKey, data, RAG_TTL);
        return data;
      }

      const results = await ghRag.search({ repo: repoToSearch, query });
      const data = sanitizeRagPayload({
        success: true,
        repo: repoToSearch ?? null,
        query,
        snippetsFound: results?.length || 0,
        snippets: results || [],
      });
      await cacheSet(ragKey, data, RAG_TTL);
      return data;
    })().finally(() => {
      inflight.delete(ragKey);
    });

    inflight.set(ragKey, p);
    const data = await p;
    
    const response = NextResponse.json(data);
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;

  } catch (error) {
    console.error('🔧 RAG API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: 'RAG service unavailable - check environment variables'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  envConfig();

  try {
    const url = new URL(request.url);
    const repoParam = pineconeNamespaceFromRepo(url.searchParams.get('repo'));
    const query = url.searchParams.get('query') || '';
    const limitParam = url.searchParams.get('limit');

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('RAG API (GET): Missing OPENAI_API_KEY');
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured',
        fallback: 'RAG service unavailable - missing OpenAI API key'
      }, { status: 500 });
    }

    if (!process.env.PINECONE_API_KEY) {
      console.error('RAG API (GET): Missing PINECONE_API_KEY');
      return NextResponse.json({
        success: false,
        error: 'Pinecone API key not configured',
        fallback: 'RAG service unavailable - missing Pinecone API key'
      }, { status: 500 });
    }

    const repoToSearch = repoParam || undefined;

    const limit = Number.isFinite(Number(limitParam)) ? Number(limitParam) : 5;

    if (process.env.DEBUG_RAG === '1') {
      console.log('[rag:GET]', repoToSearch ?? 'all', query.slice(0, 120));
    }

    const ragKey = makeKey(repoToSearch, query, limit);

    const cached = await cacheGet<any>(ragKey);
    if (cached) {
      return NextResponse.json({ ...sanitizeRagPayload(cached), cached: true });
    }

    if (inflight.has(ragKey)) {
      const data = await inflight.get(ragKey)!;
      return NextResponse.json({ ...sanitizeRagPayload(data), deduped: true });
    }

    const ghRag = getGhRag();

    const p = ghRag.search({ repo: repoToSearch, query }).then(async (results) => {
      const data = sanitizeRagPayload({
        success: true,
        repo: repoToSearch ?? null,
        query,
        snippetsFound: results?.length || 0,
        snippets: results || [],
      });
      await cacheSet(ragKey, data, RAG_TTL);
      return data;
    }).finally(() => {
      inflight.delete(ragKey);
    });

    inflight.set(ragKey, p);
    const data = await p;

    const response = NextResponse.json(data);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
  } catch (error) {
    console.error('🔧 RAG API (GET) error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: 'RAG service unavailable - check environment variables'
    }, { status: 500 });
  }
}