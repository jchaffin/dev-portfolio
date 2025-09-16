import { NextRequest, NextResponse } from 'next/server';
import { envConfig } from '@/lib/envConfig';
import { createGhRag } from '@jchaffin/gh-rag';
import { Pinecone } from '@pinecone-database/pinecone';

// Simple in-memory cache with TTL and inflight deduplication
type CacheEntry = { timestamp: number; data: any };
const ragCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const makeKey = (repo: string, query: string, limit: number) => `${repo || 'default'}::${query}::${limit}`;

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
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

    // If no repo specified, use default repo from environment or fail
    let repoToSearch = repo;
    if (!repoToSearch) {
      const defaultRepo = process.env.GITHUB_DEFAULT_REPO || process.env.GITHUB_USERNAME;
      
      if (defaultRepo) {
        repoToSearch = defaultRepo;
        console.log('🔧 RAG API: Using default repo from environment:', repoToSearch);
      } else {
        return NextResponse.json({
          success: false,
          error: 'No repository specified and no default repo configured. Please provide a repo parameter or set GITHUB_DEFAULT_REPO environment variable.'
        }, { status: 400 });
      }
    }

    console.log('🔧 RAG API: Searching repo:', repoToSearch, 'for query:', query);

    const cacheKey = makeKey(repoToSearch, query, limit);
    const now = Date.now();

    // Serve from cache if fresh
    const cached = ragCache.get(cacheKey);
    if (cached && now - cached.timestamp < TTL_MS) {
      return NextResponse.json({ ...cached.data, cached: true });
    }

    // Deduplicate inflight for same key
    if (inflight.has(cacheKey)) {
      const data = await inflight.get(cacheKey)!;
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
    
    const p = ghRag.search({ repo: repoToSearch, query }).then((results) => {
      const data = {
        success: true,
        repo: repoToSearch,
        query,
        snippetsFound: results?.length || 0,
        snippets: results || []
      };
      ragCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    }).finally(() => {
      inflight.delete(cacheKey);
    });

    inflight.set(cacheKey, p);
    const data = await p;
    
    const response = NextResponse.json(data);
    
    // Add CORS headers
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
      console.error('🔧 RAG API (GET): Missing OPENAI_API_KEY');
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured',
        fallback: 'RAG service unavailable - missing OpenAI API key'
      }, { status: 500 });
    }

    if (!process.env.PINECONE_API_KEY) {
      console.error('🔧 RAG API (GET): Missing PINECONE_API_KEY');
      return NextResponse.json({
        success: false,
        error: 'Pinecone API key not configured',
        fallback: 'RAG service unavailable - missing Pinecone API key'
      }, { status: 500 });
    }

    let repoToSearch = repoParam;
    if (!repoToSearch) {
      const defaultRepo = process.env.GITHUB_DEFAULT_REPO || process.env.GITHUB_USERNAME;
      if (defaultRepo) {
        repoToSearch = defaultRepo;
        console.log('🔧 RAG API (GET): Using default repo from environment:', repoToSearch);
      } else {
        return NextResponse.json({
          success: false,
          error: 'No repository specified and no default repo configured. Please provide a repo parameter or set GITHUB_DEFAULT_REPO environment variable.'
        }, { status: 400 });
      }
    }

    const limit = Number.isFinite(Number(limitParam)) ? Number(limitParam) : 5;

    console.log('🔧 RAG API (GET): Searching repo:', repoToSearch, 'for query:', query);

    const cacheKey = makeKey(repoToSearch, query, limit);
    const now = Date.now();
    const cached = ragCache.get(cacheKey);
    if (cached && now - cached.timestamp < TTL_MS) {
      return NextResponse.json({ ...cached.data, cached: true });
    }

    if (inflight.has(cacheKey)) {
      const data = await inflight.get(cacheKey)!;
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

    const p = ghRag.search({ repo: repoToSearch, query }).then((results) => {
      const data = {
        success: true,
        repo: repoToSearch,
        query,
        snippetsFound: results?.length || 0,
        snippets: results || []
      };
      ragCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    }).finally(() => {
      inflight.delete(cacheKey);
    });

    inflight.set(cacheKey, p);
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