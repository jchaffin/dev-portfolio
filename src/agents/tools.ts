import { defineTool, createNavigationTool, emitSuggestions } from '@jchaffin/voicekit';
import resumeData from '@/data/resume.json';

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
  description: 'Open contact form for user to email Jacob',
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
  description: 'Open Calendly to schedule a meeting with Jacob',
  parameters: {
    type: { type: 'string', enum: ['intro', 'technical', 'consulting'], description: 'Meeting type' }
  },
  execute: () => {
    const calendlyUrl = 'https://calendly.com/jchaffin57/30min';
    const result = { action: 'open_calendly', calendly_url: calendlyUrl };
    emitUI('set_meeting', result);
    return { success: true, message: 'Scheduler is now open. Say only a brief confirmation. Do not ask follow-up questions.' };
  }
});

// ============================================================================
// Resume
// ============================================================================

export const downloadResume = defineTool({
  name: 'download_resume',
  description: 'Download Jacob\'s resume PDF',
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
  description: 'Get all of Jacob\'s projects — both featured projects and GitHub repos.',
  parameters: {},
  execute: async () => {
    const featured = ((resumeData as any).projects || []).map((p: any) => ({
      name: p.name,
      description: p.description || '',
      tech: p.keywords || [],
      github: p.github || '',
      live: p.website || '',
      featured: true,
    }));

    let github: any[] = [];
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const repos = await res.json();
        github = repos.map((r: any) => ({
          name: r.name,
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

export const searchProject = defineTool({
  name: 'search_project',
  description: 'Search ingested GitHub source code (RAG). Only for implementation/code questions — not overviews. Slow.',
  parameters: {
    query: { type: 'string', description: 'Technical/code search query' },
    repo: { type: 'string', description: 'Optional: filter by repository short name' }
  },
  required: ['query'],
  execute: async ({ query, repo }: { query: string; repo?: string }) => {
    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, repo, limit: 5 })
      });

      if (!res.ok) return { success: false, error: `Search failed (${res.status})` };

      const data = await res.json();
      const snippets = (data.snippets || []).map((s: any) => ({
        repo: s.repo,
        file: s.path,
        lines: s.start && s.end ? `${s.start}-${s.end}` : undefined,
        code: s.text,
        technologies: Array.isArray(s.techStack) ? s.techStack : undefined
      }));

      // Also collect unique repos found for context
      const reposFound = Array.from(new Set(snippets.map((s: any) => s.repo).filter(Boolean)));

      return {
        success: true,
        query,
        reposSearched: repo || 'all',
        reposFound,
        resultCount: snippets.length,
        snippets
      };
    } catch {
      return { success: false, error: 'Search failed' };
    }
  }
});

export const findProjectsByTech = defineTool({
  name: 'find_projects_by_tech',
  description: 'Find projects using a specific technology (searches actual code across all repos)',
  parameters: {
    technology: { type: 'string', description: 'Technology to search for (e.g., Python, React, Kafka)' }
  },
  required: ['technology'],
  execute: async ({ technology }) => {
    try {
      const ragRes = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${technology} implementation`, limit: 20 })
      });
      
      if (!ragRes.ok) return { success: false, error: 'Search failed' };
      
      const data = await ragRes.json();
      const repoMap = new Map<string, { name: string; files: string[]; technologies: string[] }>();
      
      for (const s of data.snippets || []) {
        const repo = s.repo || s.metadata?.repo;
        if (!repo) continue;

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
            technologies: techStack
          });
        }
      }

      const projects = Array.from(repoMap.values());
      
      emitSuggestions({
        type: 'project',
        prompt: `Projects using ${technology}:`,
        items: projects.map(p => ({
          id: p.name.toLowerCase().replace(/\s+/g, '-'),
          label: p.name,
          message: `Tell me about the ${p.name} project`,
          meta: { files: p.files, technologies: p.technologies },
        })),
      });
      
      return { success: true, technology, projectCount: projects.length, projects };
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
  description: 'Get Jacob\'s work experience. Returns companies, roles, projects, and what he built at each.',
  parameters: {},
  execute: () => {
    const experiences = resumeData.experience.map(exp => ({
      company: exp.company,
      role: exp.role,
      period: `${exp.startDate}–${exp.endDate || 'Present'}`,
      location: exp.location,
      projectName: (exp as any).projectName || null,
      aliases: (exp as any).aliases || [],
      description: exp.description,
      technologies: exp.keywords || [],
      website: (exp as any).website || null,
      isCurrentRole: (exp as any).isCurrentRole || false
    }));
    
    emitSuggestions({
      type: 'experience',
      prompt: 'Experience:',
      items: experiences.map(e => ({
        id: e.company.toLowerCase().replace(/\s+/g, '-'),
        label: e.company,
        message: `Tell me about the ${e.role} role at ${e.company}`,
        description: e.role,
        meta: { period: e.period, location: e.location, projectName: e.projectName, technologies: e.technologies },
      })),
    });
    
    return { success: true, experiences };
  }
});

export const searchExperience = defineTool({
  name: 'search_experience',
  description: 'Search work experience by company or role. For skills/technology questions use find_projects_by_tech or search_project instead.',
  parameters: {
    query: { type: 'string', description: 'Company or role to search for' },
  },
  required: ['query'],
  execute: async ({ query }: { query: string }) => {
    const q = query.toLowerCase();

    // Resume metadata (instant)
    const expMatches = resumeData.experience.filter(exp => {
      const text = [
        exp.company, exp.role,
        (exp as any).projectName || '',
        ...((exp as any).aliases || []),
      ].join(' ').toLowerCase();
      return text.includes(q);
    });

    const projMatches = ((resumeData as any).projects || []).filter((p: any) =>
      p.name.toLowerCase().includes(q)
    );

    const resume = expMatches.map(exp => ({
      company: exp.company,
      role: exp.role,
      period: `${exp.startDate}–${exp.endDate || 'Present'}`,
      technologies: exp.keywords || [],
      website: (exp as any).website || null,
    }));

    const projects = projMatches.map((p: any) => ({
      name: p.name,
      tech: p.keywords || [],
      github: p.github || '',
      website: p.website || '',
    }));

    // Knowledge base docs from GCS (Pinecone)
    let knowledge: any[] = [];
    const company = resume[0]?.company?.toLowerCase().replace(/[.\s]+/g, '-') || undefined;
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, company, limit: 5 })
      });
      if (res.ok) {
        const data = await res.json();
        knowledge = (data.results || []).map((r: any) => ({
          text: r.text,
          company: r.company,
          filename: r.filename,
          score: r.score,
        }));
      }
    } catch {}

    const found = resume.length > 0 || projects.length > 0 || knowledge.length > 0;

    if (resume.length > 0) {
      emitSuggestions({
        type: 'experience',
        prompt: `Experience:`,
        items: resume.map(e => ({
          id: e.company.toLowerCase().replace(/\s+/g, '-'),
          label: e.company,
          message: `Tell me about ${e.company}`,
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
  description: 'Get Jacob\'s technical skills with proficiency levels',
  parameters: {},
  execute: () => {
    const skills = resumeData.skills || [];
    const experience = resumeData.experience || [];
    const allKeywords = experience.flatMap((e: any) => e.keywords || []);

    const skillList = skills.map((name: string) => {
      const inExperience = allKeywords.filter((k: string) =>
        k.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(k.toLowerCase())
      ).length;
      return { name, relevance: inExperience > 0 ? 'used in projects' : 'listed skill' };
    });

    emitSuggestions({
      type: 'skill',
      prompt: 'Skills:',
      items: skillList.map((s: any) => ({
        id: s.name.toLowerCase().replace(/\s+/g, '-'),
        label: s.name,
        message: `Tell me about experience with ${s.name}`,
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
  description: 'Display clickable suggestions in the UI. Use for projects, skills, experiences, or custom actions.',
  parameters: {
    type: { type: 'string', enum: ['projects', 'skills', 'experiences', 'actions', 'sections'], description: 'Type of suggestions' },
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
