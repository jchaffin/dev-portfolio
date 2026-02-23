import { createGhRag } from '@jchaffin/gh-rag';
import { Pinecone } from '@pinecone-database/pinecone';

interface IngestResult {
  repo: string;
  success: boolean;
  files?: number;
  chunks?: number;
  error?: string;
  durationMs?: number;
}

async function main() {
  console.log('🚀 RAG Ingest Job starting...');
  console.log(`⏰ ${new Date().toISOString()}`);

  // Get repos to ingest
  const repos = getReposToIngest();
  if (repos.length === 0) {
    console.error('❌ No repos configured. Set GITHUB_INGEST_REPOS or GITHUB_USERNAME.');
    process.exit(1);
  }

  console.log(`📦 Repos to ingest (${repos.length}):`, repos);

  // Validate env vars
  const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME, PINECONE_INDEX, GITHUB_TOKEN } = process.env;
  
  if (!OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    process.exit(1);
  }
  if (!PINECONE_API_KEY) {
    console.error('❌ Missing PINECONE_API_KEY');
    process.exit(1);
  }

  const indexName = PINECONE_INDEX_NAME || PINECONE_INDEX || 'repo-chunks';
  console.log(`🔗 Pinecone index: ${indexName}`);

  // Initialize clients
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.index(indexName);

  const ghRag = createGhRag({
    openaiApiKey: OPENAI_API_KEY,
    githubToken: GITHUB_TOKEN,
    pine: { index },
  });

  // Ingest each repo
  const results: IngestResult[] = [];

  for (const repo of repos) {
    const gitUrl = repo.startsWith('http') ? repo : `https://github.com/${repo}.git`;
    console.log(`\n📥 Ingesting: ${repo}`);
    console.log(`   URL: ${gitUrl}`);

    const startTime = Date.now();
    try {
      const result = await ghRag.ingest({ gitUrl });
      const durationMs = Date.now() - startTime;
      
      console.log(`   ✅ Success: ${result.files} files, ${result.chunks} chunks (${(durationMs / 1000).toFixed(1)}s)`);
      results.push({
        repo,
        success: true,
        files: result.files,
        chunks: result.chunks,
        durationMs,
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const error = err instanceof Error ? err.message : String(err);
      
      console.error(`   ❌ Failed: ${error} (${(durationMs / 1000).toFixed(1)}s)`);
      results.push({
        repo,
        success: false,
        error,
        durationMs,
      });
    }
  }

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalDuration = results.reduce((sum, r) => sum + (r.durationMs || 0), 0);

  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total repos: ${repos.length}`);
  console.log(`Successful:  ${successful.length}`);
  console.log(`Failed:      ${failed.length}`);
  console.log(`Duration:    ${(totalDuration / 1000).toFixed(1)}s`);

  if (successful.length > 0) {
    const totalFiles = successful.reduce((sum, r) => sum + (r.files || 0), 0);
    const totalChunks = successful.reduce((sum, r) => sum + (r.chunks || 0), 0);
    console.log(`Files:       ${totalFiles}`);
    console.log(`Chunks:      ${totalChunks}`);
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed repos:');
    for (const r of failed) {
      console.log(`   - ${r.repo}: ${r.error}`);
    }
  }

  console.log('\n✅ Ingest job complete');
  process.exit(failed.length > 0 ? 1 : 0);
}

function getReposToIngest(): string[] {
  // Explicit list (comma or newline separated)
  const ingestRepos = process.env.GITHUB_INGEST_REPOS;
  if (ingestRepos) {
    return ingestRepos
      .split(/[,\n]/)
      .map(r => r.trim())
      .filter(Boolean);
  }

  // Single default repo
  const defaultRepo = process.env.GITHUB_DEFAULT_REPO;
  if (defaultRepo) {
    return [defaultRepo];
  }

  // GitHub username (ingest all their public repos would require listing - just use as single repo)
  const username = process.env.GITHUB_USERNAME;
  if (username) {
    return [username];
  }

  return [];
}

main().catch((err) => {
  console.error('💥 Unhandled error:', err);
  process.exit(1);
});
