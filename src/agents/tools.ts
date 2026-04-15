/**
 * Voice tools — each `defineTool({ description })` is what the model sees at tool-pick time.
 *
 * Context pills (`ContextPills.tsx`): Skills / Projects / Experience highlight when
 * `emitSuggestions({ type: 'skill' | 'project' | 'experience' })` fires — keep `type` aligned.
 * Actions (email / meeting) are UI-only there; this file uses `open_contact_form` / `open_calendly`.
 *
 * Suggestion `message` strings should match the same text the pills send on click so
 * tool-driven chips and manual chips behave the same for the agent.
 *
 * Resume: optional `featuredProjectName` points at `projects[].name` for the long product story (`projectStory`).
 * Optional `engagement`: `employment` = W‑2 / employer job line; `owned_product` = featured project–class work
 * (more ownership, not the same category as a job — depth lives on the featured project + `projectStory`).
 * Optional `knowledgeCompany` on employment rows: Pinecone `company` filter slug for `/api/knowledge` (folder metadata).
 *
 * `get_skills`: relevance is **portfolio projects** (featured + `/api/projects` repos: name, description, topics/keywords), not job keyword lists.
 */
import { defineTool, createNavigationTool, emitSuggestions } from '@jchaffin/voicekit';
import resumeData from '@/data/resume.json';

type FeaturedProject = {
  name: string;
  description?: string;
  website?: string;
  github?: string;
  keywords?: string[];
};

function featuredProjectStory(featuredProjectName: string | undefined | null): FeaturedProject | null {
  if (!featuredProjectName) return null;
  const list = ((resumeData as { projects?: FeaturedProject[] }).projects || []) as FeaturedProject[];
  const p = list.find((x) => x.name === featuredProjectName);
  if (!p) return null;
  return {
    name: p.name,
    description: p.description,
    website: p.website,
    github: p.github,
    keywords: p.keywords,
  };
}

type ExperienceRow = (typeof resumeData.experience)[number];

function experienceEngagement(exp: ExperienceRow): string {
  return (exp as { engagement?: string }).engagement || 'employment';
}

/** Slug passed to `/api/knowledge` as `company` (Pinecone metadata). */
function knowledgeCompanySlug(exp: ExperienceRow): string {
  const kc = (exp as { knowledgeCompany?: string }).knowledgeCompany;
  if (kc) return kc;
  return exp.company.toLowerCase().replace(/[.\s]+/g, '-');
}

/** Case-insensitive: any resume experience field mentions the technology string. */
function experienceTouchesTechnology(needle: string, exp: ExperienceRow): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return false;
  const hay = [
    exp.company,
    exp.role,
    exp.description,
    ...((exp as { keywords?: string[] }).keywords || []),
    (exp as { projectName?: string }).projectName || '',
    ((exp as { featuredProjectName?: string }).featuredProjectName || ''),
  ]
    .join('\n')
    .toLowerCase();
  return hay.includes(n);
}

type KnowledgeHit = {
  text: string;
  company: string;
  filename: string;
  score?: number;
  /** Resume employer when this hit came from a per-job KB query. */
  kbEmployer?: string;
};

async function fetchKnowledgeHits(
  query: string,
  company: string | undefined,
  limit: number
): Promise<KnowledgeHit[]> {
  try {
    const res = await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, company, limit }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: { text?: string; company?: string; filename?: string; score?: number }) => ({
      text: r.text || '',
      company: r.company || '',
      filename: r.filename || '',
      score: r.score,
    }));
  } catch {
    return [];
  }
}

function dedupeKnowledgeHits(hits: KnowledgeHit[]): KnowledgeHit[] {
  const seen = new Set<string>();
  const sorted = [...hits].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const out: KnowledgeHit[] = [];
  for (const item of sorted) {
    const key = `${item.filename}|${(item.text || '').slice(0, 160)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Corpus for matching resume skills to shipped work (not employers). */
type ProjectSkillCorpus = { name: string; description: string; tech: string[] };

function projectCorpusTouchesSkill(skillName: string, p: ProjectSkillCorpus): boolean {
  const s = skillName.toLowerCase().trim();
  if (!s) return false;
  const blobs = [p.name, p.description, ...p.tech];
  for (const raw of blobs) {
    const piece = String(raw || '');
    const pl = piece.toLowerCase();
    if (pl.includes(s) || s.includes(pl)) return true;
    const chunks = piece.split(/[/,\n|]+/).map((c) => c.trim()).filter(Boolean);
    if (
      chunks.some(
        (k) => k.toLowerCase().includes(s) || s.includes(k.toLowerCase())
      )
    ) {
      return true;
    }
  }
  return false;
}

async function loadProjectsForSkillCorpus(): Promise<ProjectSkillCorpus[]> {
  const featured = ((resumeData as { projects?: FeaturedProject[] }).projects || []).map((p) => ({
    name: p.name,
    description: p.description || '',
    tech: p.keywords || [],
  }));

  let github: ProjectSkillCorpus[] = [];
  try {
    const res = await fetch('/api/projects');
    if (res.ok) {
      const repos = await res.json();
      github = (repos as any[]).map((r) => ({
        name: r.name,
        description: r.description || '',
        tech: Array.isArray(r.topics) ? r.topics : [],
      }));
    }
  } catch {}

  const featuredNames = new Set(featured.map((p) => p.name.toLowerCase()));
  const dedupedGithub = github.filter((p) => !featuredNames.has(p.name.toLowerCase()));
  return [...featured, ...dedupedGithub];
}

/** GitHub owner extracted from resume contact link, used to resolve bare repo names to owner/repo Pinecone namespaces. */
const ghOwner = ((resumeData as any).contact?.github || '').replace(/.*github\.com\//i, '').replace(/\/$/, '') || 'jchaffin';

/** All known GitHub owners/orgs from resume project URLs and additionalSourceUrls. */
const knownGhOwners: string[] = (() => {
  const owners = new Set<string>([ghOwner]);
  const projects = (resumeData as any).projects || [];
  for (const p of projects) {
    for (const url of [p.github, ...(p.additionalSourceUrls || [])]) {
      if (typeof url !== 'string') continue;
      const m = url.match(/github\.com\/([^/?#]+)/i);
      if (m?.[1]) owners.add(m[1]);
    }
  }
  return Array.from(owners);
})();

// Legacy emitUI for non-suggestion tool events (contact form, calendly, etc.)
function emitUI(name: string, data: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agent-tool-response', {
      detail: { type: 'agent_tool_end', name, output: { success: true, ...data } }
    }));
  }
}

// ============================================================================
// Navigation
// ============================================================================

export const navigate = createNavigationTool(['about', 'skills', 'projects', 'contact', 'resume', 'voice']);

// ============================================================================
// Contact & Scheduling
// ============================================================================

export const openContactForm = defineTool({
  name: 'open_contact_form',
  description:
    'Opens the on-page email contact form. After it succeeds, say one short spoken confirmation only — no follow-up questions in that turn.',
  parameters: {
    subject: { type: 'string', description: 'Email subject (optional)' },
    context: { type: 'string', description: 'Context about inquiry (optional)' }
  },
  execute: ({ subject, context }) => {
    const result = { action: 'show_contact_form', subject: subject || '', context: context || '' };
    emitUI('send_email', result);
    return { success: true, message: 'Contact form is now open. Say only a brief confirmation. Do not ask follow-up questions.' };
  }
});

export const openCalendly = defineTool({
  name: 'open_calendly',
  description:
    'Opens the scheduling UI for a 30-minute meeting. After it succeeds, say one short spoken confirmation only — no follow-up questions in that turn.',
  parameters: {},
  execute: () => {
    const calendlyUrl = 'https://calendly.com/jacob-chaffin/30min';
    emitUI('set_meeting', { action: 'open_calendly', calendly_url: calendlyUrl });
    return { success: true, message: 'Scheduler is now open. Say only a brief confirmation. Do not ask follow-up questions.' };
  }
});

// ============================================================================
// Resume
// ============================================================================

export const downloadResume = defineTool({
  name: 'download_resume',
  description: 'Starts a download of the resume PDF asset exposed by this site.',
  parameters: {},
  execute: () => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = '/resume.pdf';
      link.download = 'Jacob_Chaffin_Resume.pdf';
      link.click();
    }
    return { success: true, message: 'Resume download started' };
  }
});

// ============================================================================
// Projects
// ============================================================================

export const getProjects = defineTool({
  name: 'get_projects',
  description:
    'Lists featured portfolio entries from the bundled resume plus public GitHub repositories from the site API. High-level names, links, and blurbs only — not semantic code search. For implementation evidence use search_project or find_projects_by_tech; for job responsibilities use search_experience.',
  parameters: {},
  execute: async () => {
    const featured = ((resumeData as any).projects || []).map((p: any) => {
      const ghMatch = (p.github || '').match(/github\.com\/([^/?#]+\/[^/?#]+)/i);
      return {
        name: p.name,
        repo: ghMatch?.[1] || `${ghOwner}/${p.name}`,
        description: p.description || '',
        tech: p.keywords || [],
        github: p.github || '',
        live: p.website || '',
        featured: true,
      };
    });

    let github: any[] = [];
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const repos = await res.json();
        github = repos.map((r: any) => ({
          name: r.name,
          repo: r.full_name || `${ghOwner}/${r.name}`,
          description: r.description || '',
          tech: r.topics || [],
          github: r.html_url,
          live: r.homepage || '',
        }));
      }
    } catch {}

    const featuredNames = new Set(featured.map((p: any) => p.name.toLowerCase()));
    const dedupedGithub = github.filter(p => !featuredNames.has(p.name.toLowerCase()));
    const allProjects = [...featured, ...dedupedGithub];

    emitSuggestions({
      type: 'project',
      prompt: 'Projects:',
      items: allProjects.map(p => ({
        id: p.name.toLowerCase().replace(/\s+/g, '-'),
        label: p.name,
        message: `Tell me about the ${p.name} project`,
        description: p.description,
        meta: { url: p.live, github: p.github, tech: p.tech },
      })),
    });

    return { success: true, projects: allProjects };
  }
});

/** Resolve a bare repo name to owner/repo by checking resume projects, the GitHub API, and known orgs. */
async function resolveRepo(repo: string | undefined): Promise<string | undefined> {
  if (!repo) return undefined;
  if (repo.includes('/')) return repo;

  const bare = repo.toLowerCase();

  // 1. Check featured projects' GitHub URLs for an exact repo-name match
  const projects = ((resumeData as any).projects || []) as any[];
  for (const p of projects) {
    for (const url of [p.github, ...(p.additionalSourceUrls || [])]) {
      if (typeof url !== 'string') continue;
      const m = url.match(/github\.com\/([^/?#]+\/[^/?#]+)/i);
      if (m?.[1] && m[1].split('/')[1]?.toLowerCase() === bare) return m[1];
    }
  }

  // 2. Check user's GitHub repos from the API
  try {
    const res = await fetch('/api/projects');
    if (res.ok) {
      const repos = await res.json();
      const match = (repos as any[]).find(
        (r) => r.name?.toLowerCase() === bare
          || r.full_name?.toLowerCase() === bare
      );
      if (match?.full_name) return match.full_name;
    }
  } catch {}

  // 3. Try each known org/owner — return all candidates for the caller to try
  return `${ghOwner}/${repo}`;
}

/** For repos that might live under an org, returns all plausible owner/repo candidates. */
function repoCandidates(repo: string): string[] {
  if (repo.includes('/')) return [repo];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const owner of knownGhOwners) {
    const candidate = `${owner}/${repo}`;
    if (!seen.has(candidate.toLowerCase())) {
      seen.add(candidate.toLowerCase());
      out.push(candidate);
    }
  }
  return out;
}

export const searchProject = defineTool({
  name: 'search_project',
  description:
    'RAG: semantic search over ingested GitHub source (snippets with paths). Use for implementation detail, file locations, or reading how something works in code. Not for employment history or resume bullets — use search_experience for that. Optional repo narrows to one repository — pass the repo name or owner/repo. In replies, only summarize text that appears in returned snippets — do not invent product stories or "evaluation pipelines" not present in those snippets.',
  parameters: {
    query: { type: 'string', description: 'Technical/code search query' },
    repo: {
      type: 'string',
      description:
        'Optional: repo name (e.g. "layline.ai") or owner/repo (e.g. "jchaffin/layline.ai") to scope the search.',
    },
  },
  required: ['query'],
  execute: async ({ query, repo }: { query: string; repo?: string }) => {
    async function ragSearch(namespace: string | undefined) {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, repo: namespace, limit: 5 })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return (data.snippets || []) as any[];
    }

    try {
      let snippets: any[] = [];
      let searchedRepo: string | undefined;

      if (repo) {
        // Pinecone namespaces may be bare ("layline.ai") or owner/repo ("jchaffin/layline.ai").
        // Try the bare name first (most common ingest format), then resolved owner/repo, then other orgs.
        const bare = repo.includes('/') ? undefined : repo;
        const resolved = await resolveRepo(repo);

        const candidates: string[] = [];
        if (bare) candidates.push(bare);
        if (resolved && resolved !== bare) candidates.push(resolved);
        if (!repo.includes('/')) {
          for (const c of repoCandidates(repo)) {
            if (!candidates.includes(c)) candidates.push(c);
          }
        }

        for (const candidate of candidates) {
          const attempt = await ragSearch(candidate);
          if (attempt && attempt.length > 0) {
            snippets = attempt;
            searchedRepo = candidate;
            break;
          }
        }
      } else {
        snippets = (await ragSearch(undefined)) || [];
      }

      const mapped = snippets.map((s: any) => ({
        repo: s.repo,
        file: s.path,
        lines: s.start && s.end ? `${s.start}-${s.end}` : undefined,
        code: s.text,
        technologies: Array.isArray(s.techStack) ? s.techStack : undefined
      }));

      const reposFound = Array.from(new Set(mapped.map((s: any) => s.repo).filter(Boolean)));

      return {
        success: true,
        query,
        reposSearched: searchedRepo || 'all',
        reposFound,
        resultCount: mapped.length,
        snippets: mapped
      };
    } catch {
      return { success: false, error: 'Search failed' };
    }
  }
});

export const findProjectsByTech = defineTool({
  name: 'find_projects_by_tech',
  description:
    'Locates a technology across Jacob’s work: Pinecone skill search across repos, semantic RAG in those repos using the exact `technology` string as the query, matching featured projects when that string appears in name/description/keywords, and resume `experience` rows when it appears in role/description/keywords (returned as `experience`). Primary tool for skill-pill questions (“Tell me about Jacob’s X skills”). For company-scoped narrative docs use search_experience.',
  parameters: {
    technology: { type: 'string', description: 'Technology or stack token to locate in source (language, framework, or service name).' }
  },
  required: ['technology'],
  execute: async ({ technology }) => {
    const token = technology.trim();
    const slug = token.toLowerCase();

    try {
      const repoMap = new Map<string, { name: string; files: string[]; technologies: string[] }>();

      const ingestSnippet = (s: {
        repo?: string;
        metadata?: { repo?: string };
        path?: string;
        techStack?: string[];
      }) => {
        const repo = s.repo || s.metadata?.repo;
        if (!repo) return;
        const existing = repoMap.get(repo);
        const techStack = Array.isArray(s.techStack) ? s.techStack : [];
        if (existing) {
          if (s.path && !existing.files.includes(s.path)) existing.files.push(s.path);
          for (const t of techStack) {
            if (!existing.technologies.includes(t)) existing.technologies.push(t);
          }
        } else {
          repoMap.set(repo, {
            name: repo,
            files: s.path ? [s.path] : [],
            technologies: [...techStack],
          });
        }
      };

      const skillRes = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: token, limit: 40 }),
      });

      let skillData: { success?: boolean; snippets?: unknown[] } | null = null;
      if (skillRes.ok) {
        skillData = await skillRes.json();
        if (skillData?.success) {
          for (const s of skillData.snippets || []) ingestSnippet(s);
        }
      }

      // gh-rag hybridSearch without `repo` only queries the default Pinecone namespace; ingested
      // repos live in per-slug namespaces — run semantic search inside each skill-hit repo.
      const repoSlugs = new Set<string>();
      if (skillData?.success && Array.isArray(skillData.snippets)) {
        for (const s of skillData.snippets) {
          const r = (s as { repo?: string }).repo;
          if (typeof r === 'string' && r.length) repoSlugs.add(r);
        }
      }
      const repos = Array.from(repoSlugs).slice(0, 10);
      const ragResults =
        repos.length > 0
          ? await Promise.all(
              repos.map((r) =>
                fetch('/api/rag', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    query: token,
                    repo: r,
                    limit: 10,
                  }),
                })
              )
            )
          : [];

      for (const res of ragResults) {
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.success) continue;
        for (const s of data.snippets || []) ingestSnippet(s);
      }

      const ragRepoKeys = new Set(Array.from(repoMap.keys()).map((k) => k.toLowerCase()));
      const githubBasename = (github?: string) => {
        if (!github) return '';
        const m = github.match(/github\.com\/[^/]+\/([^/?#]+)/i);
        return (m?.[1] || '').toLowerCase();
      };

      const featured = ((resumeData as { projects?: FeaturedProject[] }).projects || []) as Array<
        FeaturedProject & { knowledgeCompany?: string }
      >;
      for (const p of featured) {
        const hay = [p.name, p.description || '', ...(p.keywords || [])].join(' ').toLowerCase();
        if (!hay.includes(slug)) continue;
        const base = githubBasename(p.github);
        const already =
          base &&
          Array.from(ragRepoKeys).some(
            (k) => k === base || k.endsWith(`/${base}`) || k.endsWith(base)
          );
        if (already) continue;
        const key = `portfolio:${p.name}`;
        if (!repoMap.has(key)) {
          repoMap.set(key, {
            name: p.name,
            files: [],
            technologies: [...(p.keywords || [])],
          });
        }
      }

      const projects = Array.from(repoMap.values());

      const experience = resumeData.experience
        .filter((exp) => experienceTouchesTechnology(slug, exp))
        .map((exp) => {
          const fp = (exp as { featuredProjectName?: string }).featuredProjectName;
          return {
            company: exp.company,
            role: exp.role,
            period: `${exp.startDate}–${exp.endDate || 'Present'}`,
            technologies: exp.keywords || [],
            engagement: experienceEngagement(exp),
            featuredProjectName: fp || null,
            projectStory: featuredProjectStory(fp),
          };
        });

      emitSuggestions({
        type: 'skill',
        prompt: `${technology} in action:`,
        items: projects.map(p => ({
          id: p.name.toLowerCase().replace(/\s+/g, '-'),
          label: p.name,
          message: `Tell me about the ${p.name} project`,
          meta: { files: p.files, technologies: p.technologies },
        })),
      });

      return {
        success: true,
        technology,
        projectCount: projects.length,
        projects,
        experienceCount: experience.length,
        experience,
      };
    } catch {
      return { success: false, error: 'Search failed' };
    }
  }
});

// ============================================================================
// Experience (from resume.json)
// ============================================================================

export const getExperience = defineTool({
  name: 'get_experience',
  description:
    'Structured work history from the resume only (no RAG, no knowledge docs). Each row includes `engagement`: `employment` (job) vs `owned_product` (featured project–class, higher ownership, not a job line). Use `projectStory` for depth when present. Use for full timeline or org chart without a search query.',
  parameters: {},
  execute: () => {
    const experiences = resumeData.experience.map((exp) => {
      const fp = (exp as { featuredProjectName?: string }).featuredProjectName;
      const engagement = (exp as { engagement?: string }).engagement || 'employment';
      return {
        company: exp.company,
        role: exp.role,
        period: `${exp.startDate}–${exp.endDate || 'Present'}`,
        location: exp.location,
        projectName: (exp as { projectName?: string }).projectName || null,
        aliases: (exp as { aliases?: string[] }).aliases || [],
        description: exp.description,
        technologies: exp.keywords || [],
        website: (exp as { website?: string }).website || null,
        isCurrentRole: (exp as { isCurrentRole?: boolean }).isCurrentRole || false,
        engagement,
        featuredProjectName: fp || null,
        projectStory: featuredProjectStory(fp),
      };
    });
    
    emitSuggestions({
      type: 'experience',
      prompt: 'Experience:',
      items: experiences.map(e => ({
        id: e.company.toLowerCase().replace(/\s+/g, '-'),
        label: e.company,
        message: `Tell me about Jacob's experience at ${e.company}`,
        description: e.role,
        meta: { period: e.period, location: e.location, projectName: e.projectName, technologies: e.technologies },
      })),
    });
    
    return { success: true, experiences };
  }
});

export const searchExperience = defineTool({
  name: 'search_experience',
  description:
    'Hybrid: (1) resume — titles, dates, org names, and `projectStory` for `owned_product`, (2) knowledge — Pinecone docs. For `engagement: employment` (W‑2 jobs), treat `knowledge[]` as the primary source for responsibilities and shipped work; use the resume slice only for role/period/structure, not as a substitute for KB text. For `owned_product`, lean on `projectStory` and optional KB when a featured project has `knowledgeCompany`. For where-in-code use find_projects_by_tech or search_project.',
  parameters: {
    query: { type: 'string', description: 'Company or role to search for' },
  },
  required: ['query'],
  execute: async ({ query }: { query: string }) => {
    const q = query.toLowerCase();

    // Resume metadata (instant)
    const expMatches = resumeData.experience.filter(exp => {
      const fp = ((exp as { featuredProjectName?: string }).featuredProjectName || '');
      const text = [
        exp.company,
        exp.role,
        (exp as { projectName?: string }).projectName || '',
        ...((exp as { aliases?: string[] }).aliases || []),
        fp,
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });

    const projMatches = ((resumeData as any).projects || []).filter((p: any) =>
      p.name.toLowerCase().includes(q)
    );

    const resume = expMatches.map((exp) => {
      const fp = (exp as { featuredProjectName?: string }).featuredProjectName;
      const engagement = (exp as { engagement?: string }).engagement || 'employment';
      return {
        company: exp.company,
        role: exp.role,
        period: `${exp.startDate}–${exp.endDate || 'Present'}`,
        technologies: exp.keywords || [],
        website: (exp as { website?: string }).website || null,
        engagement,
        featuredProjectName: fp || null,
        projectStory: featuredProjectStory(fp),
      };
    });

    const projects = projMatches.map((p: any) => ({
      name: p.name,
      tech: p.keywords || [],
      github: p.github || '',
      website: p.website || '',
    }));

    // Knowledge base (Pinecone): every matched employment row gets its own company-scoped query with a high limit.
    const EMPLOYMENT_KB_LIMIT = 36;
    const OWNED_OR_PROJECT_KB_LIMIT = 14;

    let knowledge: KnowledgeHit[] = [];
    const employmentMatches = expMatches.filter((exp) => experienceEngagement(exp) === 'employment');

    if (employmentMatches.length > 0) {
      const batches = await Promise.all(
        employmentMatches.map(async (exp) => {
          const slug = knowledgeCompanySlug(exp);
          const hits = await fetchKnowledgeHits(query, slug, EMPLOYMENT_KB_LIMIT);
          return hits.map((h) => ({ ...h, kbEmployer: exp.company }));
        })
      );
      knowledge = dedupeKnowledgeHits(batches.flat());
    } else {
      let companySlug: string | undefined;
      if (expMatches.length > 0) {
        const exp = expMatches[0];
        if (experienceEngagement(exp) === 'owned_product') {
          const fp = (exp as { featuredProjectName?: string }).featuredProjectName;
          if (fp) {
            const proj = (
              (resumeData as { projects?: { name: string; knowledgeCompany?: string }[] }).projects || []
            ).find((p) => p.name === fp);
            companySlug = proj?.knowledgeCompany || knowledgeCompanySlug(exp);
          } else {
            companySlug = knowledgeCompanySlug(exp);
          }
        } else {
          companySlug = knowledgeCompanySlug(exp);
        }
      } else if (projMatches.length > 0 && projMatches[0].knowledgeCompany) {
        companySlug = projMatches[0].knowledgeCompany as string;
      }

      if (companySlug) {
        knowledge = await fetchKnowledgeHits(query, companySlug, OWNED_OR_PROJECT_KB_LIMIT);
      } else if (expMatches.length > 0 || projMatches.length > 0) {
        knowledge = await fetchKnowledgeHits(query, undefined, OWNED_OR_PROJECT_KB_LIMIT);
      }
    }

    const found = resume.length > 0 || projects.length > 0 || knowledge.length > 0;

    if (resume.length > 0) {
      emitSuggestions({
        type: 'experience',
        prompt: `Experience:`,
        items: resume.map(e => ({
          id: e.company.toLowerCase().replace(/\s+/g, '-'),
          label: e.company,
          message: `Tell me about Jacob's experience at ${e.company}`,
          description: e.role,
        })),
      });
    }

    return { success: true, query, found, resume, projects, knowledge };
  }
});

// ============================================================================
// Skills
// ============================================================================

export const getSkills = defineTool({
  name: 'get_skills',
  description:
    'Skills pill data: each resume skill plus which **portfolio projects** mention it (featured `resume.json` projects + public repos from `/api/projects`: name, description, GitHub topics / keywords). Use `projects[]` and call `find_projects_by_tech` for source-level proof — do **not** anchor skill answers on employer job keyword rows.',
  parameters: {},
  execute: async () => {
    const skills = resumeData.skills || [];
    const projects = await loadProjectsForSkillCorpus();

    const skillList = skills.map((name: string) => {
      const hits = projects.filter((p) => projectCorpusTouchesSkill(name, p)).map((p) => p.name);
      return {
        name,
        relevance: hits.length > 0 ? 'in_portfolio_projects' : 'resume_list_only',
        projects: hits,
      };
    });

    emitSuggestions({
      type: 'skill',
      prompt: 'Skills:',
      items: skillList.map((s: { name: string; projects: string[] }) => ({
        id: s.name.toLowerCase().replace(/\s+/g, '-'),
        label: s.name,
        message: `Tell me about Jacob's ${s.name} skills`,
        description: s.projects.length > 0 ? s.projects.join(', ') : undefined,
      })),
    });

    return { success: true, skills: skillList };
  }
});

// ============================================================================
// UI Suggestions (unified)
// ============================================================================

export const showSuggestions = defineTool({
  name: 'show_suggestions',
  description:
    'Pushes a custom suggestion chip row into the UI. Prefer the built-in tools that already emit suggestions (get_projects, get_experience, get_skills, find_projects_by_tech, search_experience) before using this generic escape hatch.',
  parameters: {
    type: { type: 'string', enum: ['project', 'skill', 'experience', 'action', 'section'], description: 'Type of suggestions' },
    items: { 
      type: 'array', 
      description: 'Array of items to display',
      items: { 
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier' },
          name: { type: 'string', description: 'Display name' },
          label: { type: 'string', description: 'Label text' },
          description: { type: 'string', description: 'Optional description' }
        }
      }
    },
    prompt: { type: 'string', description: 'Prompt text to show above suggestions' }
  },
  required: ['type', 'items'],
  execute: ({ type, items, prompt }) => {
    const itemArr = Array.isArray(items) ? items : [];
    emitSuggestions({
      type: type as string || 'action',
      prompt: (prompt as string) || `Select ${type}:`,
      items: itemArr.map((item: any) => ({
        id: item.id || item.name || item.label || '',
        label: item.label || item.name || item.id || '',
        message: item.message || `Tell me about ${item.label || item.name}`,
        description: item.description,
      })),
    });
    return { success: true };
  }
});

// ============================================================================
// Export all tools as array
// ============================================================================

export const allTools = [
  navigate,
  openContactForm,
  openCalendly,
  downloadResume,
  getProjects,
  searchProject,
  findProjectsByTech,
  getExperience,
  searchExperience,
  getSkills,
  showSuggestions
];
