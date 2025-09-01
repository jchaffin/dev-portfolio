import { NextRequest, NextResponse } from 'next/server';
import { envConfig } from '@/lib/envConfig';
import { createGhRag } from '@jchaffin/gh-rag';
import { Pinecone } from '@pinecone-database/pinecone';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    
    const results = await ghRag.search({
      repo: repoToSearch,
      query
    });
    
    const response = NextResponse.json({
      success: true,
      repo: repoToSearch,
      query,
      snippetsFound: results?.length || 0,
      snippets: results || []
    });
    
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