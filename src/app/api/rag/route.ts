import { NextRequest, NextResponse } from 'next/server';
import { envConfig } from '@/lib/envConfig';
import { createGhRag } from '@jchaffin/gh-rag';
import { Pinecone } from '@pinecone-database/pinecone';
import { cacheGet, cacheSet, cacheKey } from '@/lib/redis';

// Inflight deduplication stays in-memory (per-process, short-lived)
const inflight = new Map<string, Promise<any>>();
const RAG_TTL = 300; // 5 minutes

const makeKey = (repo: string, query: string, limit: number) =>
  cacheKey('rag', repo || 'all', query, String(limit));

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
        const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
        const index = pinecone.index(indexName);

        const ghRag = createGhRag({
          openaiApiKey: process.env.OPENAI_API_KEY!,
          githubToken: process.env.GITHUB_TOKEN,
          pine: { index },
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
    const { repo, query, limit = 5 } = await request.json();

    // Validate input
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
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

    // If no repo specified, search across all repos
    const repoToSearch = repo || undefined;

    console.log('🔧 RAG API: Searching', repoToSearch ? `repo: ${repoToSearch}` : 'all repos', 'for query:', query);

    const ragKey = makeKey(repoToSearch, query, limit);

    // Serve from Redis cache if fresh
    const cached = await cacheGet<any>(ragKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // Deduplicate inflight for same key (in-memory, per-process)
    if (inflight.has(ragKey)) {
      const data = await inflight.get(ragKey)!;
      return NextResponse.json({ ...data, deduped: true });
    }

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX 
    const index = pinecone.index(indexName);

    // Search GitHub repository using gh-rag with Pinecone
    const ghRag = createGhRag({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      githubToken: process.env.GITHUB_TOKEN,
      pine: {
        index
      }
    });
    
    const p = ghRag.search({ repo: repoToSearch, query }).then(async (results) => {
      const data = {
        success: true,
        repo: repoToSearch,
        query,
        snippetsFound: results?.length || 0,
        snippets: results || []
      };
      await cacheSet(ragKey, data, RAG_TTL);
      return data;
    }).finally(() => {
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
    const repoParam = url.searchParams.get('repo') || undefined;
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

    // If no repo specified, search across all repos
    const repoToSearch = repoParam || undefined;

    const limit = Number.isFinite(Number(limitParam)) ? Number(limitParam) : 5;

    console.log('🔧 RAG API (GET): Searching', repoToSearch ? `repo: ${repoToSearch}` : 'all repos', 'for query:', query);

    const ragKey = makeKey(repoToSearch, query, limit);

    const cached = await cacheGet<any>(ragKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    if (inflight.has(ragKey)) {
      const data = await inflight.get(ragKey)!;
      return NextResponse.json({ ...data, deduped: true });
    }

    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
    const index = pinecone.index(indexName);

    const ghRag = createGhRag({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      githubToken: process.env.GITHUB_TOKEN,
      pine: { index }
    });

    const p = ghRag.search({ repo: repoToSearch, query }).then(async (results) => {
      const data = {
        success: true,
        repo: repoToSearch,
        query,
        snippetsFound: results?.length || 0,
        snippets: results || []
      };
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