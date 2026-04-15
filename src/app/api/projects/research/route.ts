import { NextRequest, NextResponse } from 'next/server';
import Perplexity from '@perplexity-ai/perplexity_ai';
import { prisma } from '@/lib/db';
import { cacheGet, cacheSet, cacheKey, cacheDel } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const DEEP_DIVE_CACHE_TTL = 86400; // 24 hours

/** Key by project images path segment, e.g. "prosodyai" from "/projects/prosodyai" */
function getDeepDiveKey(imagesPath: string): string | null {
  if (!imagesPath) return null;
  const match = String(imagesPath).match(/\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

async function getProjectByKey(key: string): Promise<{ name: string; website: string; github?: string; knowledgeCompany?: string; ragRepo?: string; additionalSourceUrls: string[] } | null> {
  const project = await prisma.project.findUnique({
    where: { key },
    include: { sources: true },
  });
  if (!project?.website) return null;
  const knowledgeSource = project.sources.find((s) => s.type === 'KNOWLEDGE');
  const ragSource = project.sources.find((s) => s.type === 'RAG' || s.type === 'GITHUB');
  const ragRepo = ragSource?.repo ?? (project.github ? repoFromGithubUrl(project.github) ?? undefined : undefined);
  const raw = (project as { additionalSourceUrls?: string[] }).additionalSourceUrls;
  const additionalSourceUrls = Array.isArray(raw) ? raw.filter((u): u is string => typeof u === 'string' && u.startsWith('http')) : [];
  return {
    name: project.name,
    website: project.website,
    github: project.github ?? undefined,
    knowledgeCompany: knowledgeSource?.company ?? undefined,
    ragRepo,
    additionalSourceUrls,
  };
}

function repoFromGithubUrl(github: string): string | null {
  try {
    const u = new URL(github.trim());
    if (!/github\.com$/i.test(u.hostname)) return null;
    const path = u.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    return path.length >= 2 ? `${path[0]}/${path[1]}` : null;
  } catch {
    return null;
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? (request.url.startsWith('https') ? 'https' : 'http');
  if (host) return `${proto === 'https' ? 'https' : 'http'}://${host}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function fetchKnowledgeContext(baseUrl: string, projectName: string, company: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/api/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `${projectName} overview architecture tech stack product features`,
        company,
        limit: 15,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const results = (data.results || []).filter((r: { text?: string }) => r.text?.trim());
    if (results.length === 0) return '';
    return results.map((r: { text: string; filepath?: string }) => `[${r.filepath || 'doc'}]\n${r.text}`).join('\n\n');
  } catch {
    return '';
  }
}

async function fetchRagContext(baseUrl: string, projectName: string, repo: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/api/rag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `${projectName} overview architecture implementation`,
        repo,
        limit: 12,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const snippets = (data.snippets || []).filter((s: { text?: string }) => s.text?.trim());
    if (snippets.length === 0) return '';
    return snippets
      .map((s: { path?: string; text: string; repo?: string }) => `[${s.repo || repo}/${s.path || 'file'}]\n${s.text}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

/** Build allowed search domains from project data only (website + additionalSourceUrls). No hardcoding. */
function buildSearchDomains(website: string, additionalSourceUrls: string[]): string[] {
  const hosts: string[] = [];
  const add = (h: string) => {
    const lower = h.toLowerCase();
    if (!hosts.includes(lower)) hosts.push(lower);
    const w = lower.startsWith('www.') ? lower.replace(/^www\./, '') : `www.${lower}`;
    if (!hosts.includes(w)) hosts.push(w);
  };
  try {
    add(new URL(website).hostname);
  } catch {
    // skip
  }
  for (const urlStr of additionalSourceUrls) {
    try {
      add(new URL(urlStr).hostname);
    } catch {
      // skip invalid
    }
  }
  return hosts;
}

async function fetchDeepDiveFromPerplexity(
  name: string,
  website: string,
  contextFromOtherSources: string,
  searchDomains: string[],
  preferredUrls: string[]
): Promise<{ body: string; citations: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const contextBlock =
    contextFromOtherSources.trim().length > 0
      ? `Use the following context from internal documentation and codebase when relevant (weave it into your answer; do not repeat it verbatim):\n\n${contextFromOtherSources.trim()}\n\n---\n\n`
      : '';

  const client = new Perplexity({ apiKey });

  const body: Parameters<Perplexity['chat']['completions']['create']>[0] = {
    model: 'sonar',
    max_tokens: 2048,
    stream: false,
    messages: [
      {
        role: 'system',
        content:
          'Write a detailed portfolio deep-dive in markdown: 6–10 paragraphs or equivalent with clear sections. Use **bold** for tech and key terms. Use ## for section headings (e.g. Overview, Tech Stack, Architecture, Outcomes). When useful, include LaTeX math (inline $...$ or block $$...$$) for metrics or formulas, and Mermaid diagrams (```mermaid ... ```) for architecture, flows, or data pipelines. Describe ONLY the single product or company you are given—do not mention or summarize any other company, product, or brand. When internal context is provided, aggregate it with web search results into one coherent narrative. Cite only sources from the allowed search results. Output valid markdown only.',
      },
      {
        role: 'user',
        content: `${contextBlock}Summarize ONLY this product/company—no other companies. Product name: "${name}". Official website: ${website}.${preferredUrls.length > 0 ? ` Preferred sources to cite when relevant: ${preferredUrls.join(', ')}.` : ''} Write a thorough deep-dive: what it is, who it's for, problem it solves, main tech stack and architecture, key features, and notable outcomes or differentiators. Use the context above (if any) and web search. Factual and specific. Include multiple paragraphs and optional section headings (##).`,
      },
    ],
  };
  if (searchDomains.length > 0) {
    body.search_domain_filter = searchDomains;
  }

  const response = await client.chat.completions.create(body);
  type Chunk = {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> | null } }>;
    citations?: string[] | null;
    search_results?: Array<{ url: string }> | null;
  };
  const chunk = response as Chunk;

  const msg = chunk.choices?.[0]?.message;
  const rawContent = msg?.content;
  const content = (() => {
    if (typeof rawContent === 'string') return rawContent.trim();
    if (Array.isArray(rawContent)) {
      return rawContent
        .map((c) => (c && typeof c === 'object' && 'text' in c ? (c as { text?: string }).text : ''))
        .filter(Boolean)
        .join('')
        .trim();
    }
    return '';
  })();
  if (!content) throw new Error('Empty response from Perplexity');

  const citationUrls: string[] =
    chunk.citations && chunk.citations.length > 0
      ? chunk.citations
      : (chunk.search_results ?? []).map((r) => r.url).filter(Boolean);

  const bodyWithLinks = content.replace(/\[(\d+)\](?!\()/g, (_, num) => {
    const i = parseInt(num, 10) - 1;
    const url = citationUrls[i];
    return url ? `[${num}](${url})` : `[${num}]`;
  });
  const normalizedPreferred = preferredUrls.filter((u) => {
    try {
      const n = new URL(u).href.toLowerCase();
      return !citationUrls.some((c) => c.toLowerCase() === n);
    } catch {
      return false;
    }
  });
  return { body: bodyWithLinks, citations: citationUrls.concat(normalizedPreferred) };
}

/** Extract image URLs from HTML; same-site (same root domain) to include CDNs, max 8. */
function getRootDomain(url: URL): string {
  const host = url.hostname.toLowerCase();
  const parts = host.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return host;
}

async function scrapeImagesFromUrl(website: string): Promise<string[]> {
  try {
    const res = await fetch(website, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioBot/1.0)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const baseUrl = new URL(website);
    const siteRoot = getRootDomain(baseUrl);
    const seen = new Set<string>();
    const urls: string[] = [];
    const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(html)) !== null && urls.length < 8) {
      try {
        const href = m[1].trim();
        if (/^\s*data:/i.test(href) || /^\s*#/.test(href)) continue;
        const absolute = new URL(href, baseUrl).href;
        const u = new URL(absolute);
        if (getRootDomain(u) !== siteRoot) continue;
        if (seen.has(absolute)) continue;
        seen.add(absolute);
        urls.push(absolute);
      } catch {
        // skip invalid URLs
      }
    }
    return urls;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  }

  const project = await getProjectByKey(key);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const cacheKeyStr = cacheKey('deepdive', key);
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1' || request.nextUrl.searchParams.get('refresh') === 'true';
  if (forceRefresh) {
    await cacheDel(cacheKeyStr);
  } else {
    const cached = await cacheGet<{ title: string; body: string; images: string[]; website: string; citations?: string[] }>(cacheKeyStr);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
      });
    }
  }

  try {
    const baseUrl = getBaseUrl(request);
    const ragRepo = project.ragRepo ?? null;

    const [kbContext, ragContext] = await Promise.all([
      project.knowledgeCompany
        ? fetchKnowledgeContext(baseUrl, project.name, project.knowledgeCompany)
        : Promise.resolve(''),
      ragRepo ? fetchRagContext(baseUrl, project.name, ragRepo) : Promise.resolve(''),
    ]);

    const combinedContext = [kbContext, ragContext].filter(Boolean).join('\n\n');

    const searchDomains = buildSearchDomains(project.website, project.additionalSourceUrls);
    const [{ body, citations }, images] = await Promise.all([
      fetchDeepDiveFromPerplexity(project.name, project.website, combinedContext, searchDomains, project.additionalSourceUrls),
      scrapeImagesFromUrl(project.website),
    ]);

    const payload = {
      title: `${project.name} — Overview`,
      body,
      images,
      website: project.website,
      citations,
    };

    await cacheSet(cacheKeyStr, payload, DEEP_DIVE_CACHE_TTL);

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to build deep dive';
    console.error('Deep dive error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
