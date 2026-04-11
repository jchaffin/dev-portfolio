import { NextRequest, NextResponse } from 'next/server';
import { Pinecone, type RecordMetadata } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Use text-embedding-3-large to match 3072 dim index
const EMBEDDING_MODEL = 'text-embedding-3-large';

const KNOWLEDGE_DIR = path.join(process.cwd(), 'src/data/knowledge');
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const NAMESPACE = 'knowledge';

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.pdf', '.json'];

interface ChunkMetadata {
  text: string;
  company: string;
  filename: string;
  filepath: string;
  chunkIndex: number;
  totalChunks: number;
  source: 'knowledge';
}

// Split text into chunks with overlap
function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }
  
  return chunks.filter(c => c.trim().length > 50); // Filter out tiny chunks
}

// Extract text from PDF
async function extractPdfText(filepath: string): Promise<string> {
  try {
    const buffer = fs.readFileSync(filepath);
    const { extractText } = await import('unpdf');
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8);
    return Array.isArray(result.text) ? result.text.join('\n\n') : String(result.text || '');
  } catch (error) {
    console.error('PDF parse error:', error);
    return '';
  }
}

// Read file content based on type
async function readFileContent(filepath: string): Promise<string> {
  const ext = path.extname(filepath).toLowerCase();
  
  if (ext === '.pdf') {
    return extractPdfText(filepath);
  } else if (ext === '.json') {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.stringify(JSON.parse(content), null, 2);
  } else {
    // .md, .txt, etc.
    return fs.readFileSync(filepath, 'utf-8');
  }
}

// Recursively get all files in a directory
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  }
  
  return arrayOfFiles;
}

// PUT: Ingest knowledge base into Pinecone
export async function PUT(request: NextRequest) {
  try {
    const { company } = await request.json().catch(() => ({}));
    
    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Missing required API keys (OPENAI_API_KEY, PINECONE_API_KEY)',
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
    const index = pinecone.index(indexName);

    // Get target directory
    const targetDir = company 
      ? path.join(KNOWLEDGE_DIR, company)
      : KNOWLEDGE_DIR;
    
    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({
        success: false,
        error: `Directory not found: ${targetDir}`,
      }, { status: 404 });
    }

    const files = getAllFiles(targetDir);
    console.log(`📚 Knowledge Ingest: Found ${files.length} files to process`);

    let totalChunks = 0;
    const results: { file: string; chunks: number; error?: string }[] = [];

    for (const filepath of files) {
      try {
        // Determine company from path
        const relativePath = path.relative(KNOWLEDGE_DIR, filepath);
        const pathParts = relativePath.split(path.sep);
        const fileCompany = pathParts[0] || 'general';
        const filename = path.basename(filepath);

        console.log(`📄 Processing: ${relativePath}`);

        // Read and chunk content
        const content = await readFileContent(filepath);
        const chunks = chunkText(content);

        if (chunks.length === 0) {
          results.push({ file: relativePath, chunks: 0, error: 'No content' });
          continue;
        }

        // Generate embeddings
        const embeddingResponse = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: chunks,
        });

        // Prepare vectors for Pinecone
        const vectors = chunks.map((chunk, i) => ({
          id: `knowledge-${fileCompany}-${filename}-${i}`,
          values: embeddingResponse.data[i].embedding,
          metadata: {
            text: chunk,
            company: fileCompany,
            filename,
            filepath: relativePath,
            chunkIndex: i,
            totalChunks: chunks.length,
            source: 'knowledge',
          } as RecordMetadata,
        }));

        // Upsert to Pinecone
        await index.namespace(NAMESPACE).upsert(vectors);

        totalChunks += chunks.length;
        results.push({ file: relativePath, chunks: chunks.length });
        console.log(`✅ Indexed: ${relativePath} (${chunks.length} chunks)`);

      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Error processing ${filepath}:`, error);
        results.push({ file: path.relative(KNOWLEDGE_DIR, filepath), chunks: 0, error });
      }
    }

    return NextResponse.json({
      success: true,
      filesProcessed: files.length,
      totalChunks,
      results,
    });

  } catch (error) {
    console.error('📚 Knowledge Ingest error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST: Search knowledge base
export async function POST(request: NextRequest) {
  try {
    const { query, company, limit = 10 } = await request.json();

    if (!query) {
      return NextResponse.json({ success: false, error: 'query is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Missing required API keys',
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
    const index = pinecone.index(indexName);

    // Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Build filter if company specified
    const filter = company ? { company: { $eq: company } } : undefined;

    // Search Pinecone
    const searchResults = await index.namespace(NAMESPACE).query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      filter,
    });

    const results = searchResults.matches?.map(match => ({
      score: match.score,
      text: (match.metadata as any)?.text || '',
      company: (match.metadata as any)?.company || '',
      filename: (match.metadata as any)?.filename || '',
      filepath: (match.metadata as any)?.filepath || '',
    })) || [];

    return NextResponse.json({
      success: true,
      query,
      company: company || 'all',
      resultsFound: results.length,
      results,
    });

  } catch (error) {
    console.error('📚 Knowledge Search error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET: List knowledge base contents
export async function GET() {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return NextResponse.json({ success: true, companies: [], files: [] });
    }

    const companies = fs.readdirSync(KNOWLEDGE_DIR)
      .filter(f => fs.statSync(path.join(KNOWLEDGE_DIR, f)).isDirectory());

    const filesByCompany: Record<string, string[]> = {};
    
    for (const company of companies) {
      const companyDir = path.join(KNOWLEDGE_DIR, company);
      const files = getAllFiles(companyDir).map(f => path.relative(KNOWLEDGE_DIR, f));
      filesByCompany[company] = files;
    }

    return NextResponse.json({
      success: true,
      knowledgeDir: KNOWLEDGE_DIR,
      companies,
      filesByCompany,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
