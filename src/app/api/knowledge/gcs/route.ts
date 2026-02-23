import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Use text-embedding-3-large to match 3072 dim index
const EMBEDDING_MODEL = 'text-embedding-3-large';

const BUCKET_NAME = 'work-experience';
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const NAMESPACE = 'knowledge';
const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.pdf', '.json', '.doc', '.docx'];

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
  
  return chunks.filter(c => c.trim().length > 50);
}

// Extract text from PDF buffer using unpdf
async function extractPdfText(buffer: Buffer, filename: string): Promise<string> {
  try {
    const { extractText } = await import('unpdf');
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8);
    // result.text is an array of page texts
    const text = Array.isArray(result.text) ? result.text.join('\n\n') : String(result.text || '');
    console.log(`📄 PDF "${filename}": ${result.totalPages} pages, ${text.length} chars`);
    return text;
  } catch (error) {
    console.error(`📄 PDF "${filename}" parse error:`, error);
    return '';
  }
}

// Read file content based on type
async function readFileContent(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  if (ext === 'pdf') {
    return extractPdfText(buffer, filename);
  } else if (ext === 'json') {
    try {
      return JSON.stringify(JSON.parse(buffer.toString('utf-8')), null, 2);
    } catch {
      return buffer.toString('utf-8');
    }
  } else {
    // .md, .txt, etc.
    return buffer.toString('utf-8');
  }
}

// Initialize GCS client
function getStorageClient(): Storage {
  // Check for service account JSON in env
  if (process.env.GCS_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_JSON);
    return new Storage({ credentials });
  }
  
  // Check for keyfile path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
  }
  
  // Fall back to default credentials (works on GCP or with gcloud auth)
  return new Storage();
}

// GET: List files in GCS bucket
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || '';
    
    const storage = getStorageClient();
    const bucket = storage.bucket(BUCKET_NAME);
    
    const [files] = await bucket.getFiles({ prefix });
    
    // Group files by company (first path segment)
    const filesByCompany: Record<string, string[]> = {};
    
    for (const file of files) {
      const name = file.name;
      const ext = '.' + (name.split('.').pop() || '').toLowerCase();
      
      // Skip directories and unsupported files
      if (name.endsWith('/') || !SUPPORTED_EXTENSIONS.includes(ext)) continue;
      
      const parts = name.split('/');
      const company = parts[0] || 'general';
      
      if (!filesByCompany[company]) {
        filesByCompany[company] = [];
      }
      filesByCompany[company].push(name);
    }
    
    return NextResponse.json({
      success: true,
      bucket: BUCKET_NAME,
      prefix,
      companies: Object.keys(filesByCompany),
      filesByCompany,
      totalFiles: files.filter(f => !f.name.endsWith('/')).length,
    });
    
  } catch (error) {
    console.error('GCS list error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// PUT: Ingest from GCS bucket into Pinecone
export async function PUT(request: NextRequest) {
  try {
    const { company, dryRun = false } = await request.json().catch(() => ({}));
    
    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Missing required API keys (OPENAI_API_KEY, PINECONE_API_KEY)',
      }, { status: 500 });
    }

    const storage = getStorageClient();
    const bucket = storage.bucket(BUCKET_NAME);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX;
    
    if (!indexName) {
      return NextResponse.json({
        success: false,
        error: 'Missing PINECONE_INDEX_NAME or PINECONE_INDEX env var',
      }, { status: 500 });
    }
    
    const index = pinecone.index(indexName);

    // List files
    const prefix = company ? `${company}/` : '';
    const [files] = await bucket.getFiles({ prefix });
    
    // Filter to supported files only
    const supportedFiles = files.filter(file => {
      const name = file.name;
      if (name.endsWith('/')) return false; // Skip directories
      const ext = '.' + (name.split('.').pop() || '').toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });

    console.log(`📚 GCS Ingest: Found ${supportedFiles.length} files in gs://${BUCKET_NAME}/${prefix}`);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        bucket: BUCKET_NAME,
        prefix,
        filesFound: supportedFiles.length,
        files: supportedFiles.map(f => f.name),
      });
    }

    let totalChunks = 0;
    const results: { file: string; chunks: number; error?: string }[] = [];

    for (const file of supportedFiles) {
      try {
        const filename = file.name;
        const parts = filename.split('/');
        const fileCompany = parts[0] || 'general';
        const basename = parts[parts.length - 1];

        console.log(`📄 Processing: ${filename}`);

        // Download file to memory
        const [buffer] = await file.download();
        
        // Parse content
        const content = await readFileContent(buffer, filename);
        
        const contentStr = typeof content === 'string' ? content : '';
        if (!contentStr || contentStr.trim().length < 50) {
          results.push({ file: filename, chunks: 0, error: 'No extractable content' });
          continue;
        }

        // Chunk content
        const chunks = chunkText(contentStr);

        if (chunks.length === 0) {
          results.push({ file: filename, chunks: 0, error: 'No chunks after processing' });
          continue;
        }

        // Batch embeddings (max 2048 inputs per request)
        const batchSize = 100;
        const allVectors: any[] = [];
        
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batchChunks = chunks.slice(i, i + batchSize);
          
          const embeddingResponse = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: batchChunks,
          });

          const batchVectors = batchChunks.map((chunk, j) => ({
            id: `gcs-${fileCompany}-${basename}-${i + j}`.replace(/[^a-zA-Z0-9-_]/g, '_'),
            values: embeddingResponse.data[j].embedding,
            metadata: {
              text: chunk,
              company: fileCompany,
              filename: basename,
              filepath: filename,
              chunkIndex: i + j,
              totalChunks: chunks.length,
              source: 'gcs',
              bucket: BUCKET_NAME,
            },
          }));
          
          allVectors.push(...batchVectors);
        }

        // Upsert to Pinecone in batches
        const upsertBatchSize = 100;
        for (let i = 0; i < allVectors.length; i += upsertBatchSize) {
          const batch = allVectors.slice(i, i + upsertBatchSize);
          await index.namespace(NAMESPACE).upsert(batch);
        }

        totalChunks += chunks.length;
        results.push({ file: filename, chunks: chunks.length });
        console.log(`✅ Indexed: ${filename} (${chunks.length} chunks)`);

      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Error processing ${file.name}:`, error);
        results.push({ file: file.name, chunks: 0, error });
      }
    }

    return NextResponse.json({
      success: true,
      bucket: BUCKET_NAME,
      prefix,
      filesProcessed: supportedFiles.length,
      totalChunks,
      results,
    });

  } catch (error) {
    console.error('📚 GCS Ingest error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
