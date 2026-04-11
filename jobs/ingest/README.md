# RAG Ingest Job

## Production (Vercel)

**Scheduled ingest runs on Vercel**, not in this folder. [`vercel.json`](../vercel.json) defines a cron that calls **`GET /api/cron/ingest`** daily at **04:00 UTC** (`0 4 * * *`). That handler lives at [`src/app/api/cron/ingest/route.ts`](../src/app/api/cron/ingest/route.ts), uses `@jchaffin/gh-rag`, and walks your GitHub repos (via `GITHUB_TOKEN`) into Pinecone.

| Env (Vercel project) | Notes |
|----------------------|--------|
| `OPENAI_API_KEY` | Required |
| `PINECONE_API_KEY` | Required |
| `PINECONE_INDEX` or `PINECONE_INDEX_NAME` | Required |
| `GITHUB_TOKEN` | Required (repo access for ingest) |
| `CRON_SECRET` | Recommended: Vercel sends `Authorization: Bearer …` on cron invocations; also use for manual triggers |

Ensure the Vercel project has **Cron Jobs** enabled for your plan (Pro or configured cron on Hobby where supported).

---

## This folder (`jobs/ingest`)

Optional **standalone** script when you want to ingest an **explicit repo list** locally, in CI, or in a one-off container — same RAG stack, **not** what Vercel invokes on the schedule above.

## Environment Variables (standalone script)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings |
| `PINECONE_API_KEY` | Yes | Pinecone API key |
| `PINECONE_INDEX_NAME` | No | Pinecone index name (default: `repo-chunks`) |
| `GITHUB_TOKEN` | No | GitHub token for private repos |
| `GITHUB_INGEST_REPOS` | No | Comma-separated list of repos (e.g., `owner/repo1,owner/repo2`) |
| `GITHUB_DEFAULT_REPO` | No | Single repo fallback |
| `GITHUB_USERNAME` | No | Username fallback |

## Run Locally

```bash
cd jobs/ingest
npm install

# Set env vars
export OPENAI_API_KEY="..."
export PINECONE_API_KEY="..."
export GITHUB_INGEST_REPOS="owner/repo1,owner/repo2"

npm start
```

## Optional: deploy as a container (e.g. GCP Cloud Run)

Only if you want this **standalone** job on your own infra—not required for the Vercel-hosted app.

### 1. Build and push container

```bash
# Set your GCP project
PROJECT_ID="your-project-id"
REGION="us-central1"

# Build
docker build -t gcr.io/$PROJECT_ID/gh-rag-ingest .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/gh-rag-ingest
```

### 2. Create Cloud Run Job

```bash
gcloud run jobs create gh-rag-ingest \
  --image gcr.io/$PROJECT_ID/gh-rag-ingest \
  --region $REGION \
  --memory 1Gi \
  --cpu 1 \
  --task-timeout 30m \
  --max-retries 1 \
  --set-env-vars "PINECONE_INDEX_NAME=repo-chunks" \
  --set-secrets "OPENAI_API_KEY=openai-api-key:latest,PINECONE_API_KEY=pinecone-api-key:latest,GITHUB_TOKEN=github-token:latest,GITHUB_INGEST_REPOS=github-ingest-repos:latest"
```

### 3. Schedule with Cloud Scheduler

```bash
# Daily at 6 AM UTC
gcloud scheduler jobs create http gh-rag-ingest-daily \
  --location $REGION \
  --schedule "0 6 * * *" \
  --uri "https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/gh-rag-ingest:run" \
  --http-method POST \
  --oauth-service-account-email "$PROJECT_ID@appspot.gserviceaccount.com"
```

### 4. Run manually (test)

```bash
gcloud run jobs execute gh-rag-ingest --region $REGION
```

## Optional: GitHub Actions

Add `.github/workflows/ingest.yml` if you want scheduled ingest outside Vercel:

```yaml
name: Daily RAG Ingest

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:      # Manual trigger

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: jobs/ingest
        run: npm install
      
      - name: Run ingest
        working-directory: jobs/ingest
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          PINECONE_API_KEY: ${{ secrets.PINECONE_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_INGEST_REPOS: ${{ vars.GITHUB_INGEST_REPOS }}
        run: npm start
```
