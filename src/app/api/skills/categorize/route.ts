import { NextRequest, NextResponse } from 'next/server'
import { cacheGet, cacheSet, cacheKey, hashKey } from '@/lib/redis'
import { SKILL_CATEGORIES } from '@/lib/constants'

const CACHE_TTL = 3600 // 1 hour

const CATEGORY_MAP: Record<string, string> = {
  // Languages
  'python': SKILL_CATEGORIES.LANGUAGES,
  'node.js': SKILL_CATEGORIES.BACKEND,
  'typescript': SKILL_CATEGORIES.LANGUAGES,
  'javascript': SKILL_CATEGORIES.LANGUAGES,

  // Frontend
  'next.js': SKILL_CATEGORIES.FRONTEND,
  'react': SKILL_CATEGORIES.FRONTEND,
  'react native': SKILL_CATEGORIES.FRONTEND,
  'tailwind css': SKILL_CATEGORIES.FRONTEND,
  'html': SKILL_CATEGORIES.FRONTEND,
  'css': SKILL_CATEGORIES.FRONTEND,

  // Backend
  'graphql': SKILL_CATEGORIES.BACKEND,
  'apollo gateway': SKILL_CATEGORIES.BACKEND,
  'kafka': SKILL_CATEGORIES.BACKEND,
  'websockets': SKILL_CATEGORIES.BACKEND,
  'sse': SKILL_CATEGORIES.BACKEND,
  'rest': SKILL_CATEGORIES.BACKEND,
  'fastapi': SKILL_CATEGORIES.BACKEND,
  'express': SKILL_CATEGORIES.BACKEND,
  'prisma': SKILL_CATEGORIES.BACKEND,

  // AI & ML
  'langgraph': SKILL_CATEGORIES.AI_ML,
  'rag': SKILL_CATEGORIES.AI_ML,
  'pytorch': SKILL_CATEGORIES.AI_ML,
  'tensorflow': SKILL_CATEGORIES.AI_ML,
  'llm': SKILL_CATEGORIES.AI_ML,
  'nlu': SKILL_CATEGORIES.AI_ML,
  'openai api': SKILL_CATEGORIES.AI_ML,
  'pinecone': SKILL_CATEGORIES.AI_ML,
  'prosodyssm': SKILL_CATEGORIES.AI_ML,
  'mamba ssm': SKILL_CATEGORIES.AI_ML,
  'gru': SKILL_CATEGORIES.AI_ML,
  'feature extraction': SKILL_CATEGORIES.AI_ML,
  'conversational ai': SKILL_CATEGORIES.AI_ML,

  // Infrastructure & Real-time
  'livekit': SKILL_CATEGORIES.INFRASTRUCTURE,
  'pipecat': SKILL_CATEGORIES.INFRASTRUCTURE,
  'webrtc': SKILL_CATEGORIES.INFRASTRUCTURE,
  'streaming audio': SKILL_CATEGORIES.INFRASTRUCTURE,
  'audio processing': SKILL_CATEGORIES.INFRASTRUCTURE,
  'voice ai platform': SKILL_CATEGORIES.INFRASTRUCTURE,
  'voice call infrastructure': SKILL_CATEGORIES.INFRASTRUCTURE,
  'conversational avatar': SKILL_CATEGORIES.INFRASTRUCTURE,
  'real-time analytics': SKILL_CATEGORIES.INFRASTRUCTURE,
  'real-time systems': SKILL_CATEGORIES.INFRASTRUCTURE,

  // DevOps & Cloud
  'kubernetes': SKILL_CATEGORIES.DEVOPS,
  'docker': SKILL_CATEGORIES.DEVOPS,
  'aws': SKILL_CATEGORIES.DEVOPS,
  'aws s3': SKILL_CATEGORIES.DEVOPS,
  'gcp': SKILL_CATEGORIES.DEVOPS,
  'terraform': SKILL_CATEGORIES.DEVOPS,
  'ci/cd': SKILL_CATEGORIES.DEVOPS,
  'deployment automation': SKILL_CATEGORIES.DEVOPS,
  'observability': SKILL_CATEGORIES.DEVOPS,
  'github actions': SKILL_CATEGORIES.DEVOPS,
  'vercel': SKILL_CATEGORIES.DEVOPS,

  // Auth / Infra
  'jwt': SKILL_CATEGORIES.BACKEND,
  'twilio': SKILL_CATEGORIES.INFRASTRUCTURE,
  'rbac': SKILL_CATEGORIES.BACKEND,
  'stripe connect': SKILL_CATEGORIES.BACKEND,
  'tooling': SKILL_CATEGORIES.DEVOPS,
  'visualization': SKILL_CATEGORIES.FRONTEND,
  'dpu': SKILL_CATEGORIES.AI_ML,
};

function categorizeSkill(name: string): string {
  const lower = name.toLowerCase().trim();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return cat;
  }
  return 'Other';
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

interface Skill {
  name: string
  level: number
  category: string
  calculation?: {
    frequency: number
    maxFrequency: number
    sources: string[]
    breakdown: {
      projects: number
      experience: number
      resumeSkills: number
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    let { skills } = await request.json().catch(() => ({ skills: undefined }))

    // If no skills provided, fetch them from portfolio data
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      // Import portfolio skills and calculate dynamic levels
      const { skills: portfolioSkills } = await import('@/data/portfolio')
      const { getDynamicSkills } = await import('@/lib/skills')
      
      // Fetch GitHub projects for skill calculation
      let projects: { title: string; description: string; tech: string[] }[] = []
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const res = await fetch(`${baseUrl}/api/projects`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const featured = Array.isArray(data.featured) ? data.featured : []
          const repos = Array.isArray(data.repos) ? data.repos : []
          const toProject = (item: any) => ({
            title: item.name || item.title || '',
            description: item.description || '',
            tech: Array.isArray(item.topics) ? item.topics : (item.keywords || []),
          })
          projects = [...featured.map(toProject), ...repos.map(toProject)]
        }
      } catch {
        // Continue without GitHub projects
      }
      
      skills = getDynamicSkills(portfolioSkills, projects)
    }

    const skillsHash = hashKey(JSON.stringify(skills))
    const redisCacheKey = cacheKey('skills:v3', skillsHash)
    const cached = await cacheGet<{ categorizedSkills: any[] }>(redisCacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const categorizedSkills = (skills as Skill[]).map(s => ({
      name: s.name,
      level: Math.min(95, Math.max(70, s.level ?? 70)),
      category: categorizeSkill(s.name),
      subSkills: [s.name],
      calculation: s.calculation,
    })).sort((a, b) => b.level - a.level).slice(0, 8)

    const result = { categorizedSkills }
    await cacheSet(redisCacheKey, result, CACHE_TTL)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Semantic categorize error:', error)
    return NextResponse.json(
      { error: 'Failed to categorize skills' },
      { status: 500 }
    )
  }
}
