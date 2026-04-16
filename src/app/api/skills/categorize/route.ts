import { NextRequest, NextResponse } from 'next/server'
import { cacheGet, cacheSet, cacheKey, hashKey } from '@/lib/redis'
import { SKILL_CATEGORIES } from '@/lib/constants'

const CACHE_TTL = 3600 // 1 hour

let _pipelinePromise: Promise<any> | null = null
function getEmbedder() {
  if (!_pipelinePromise) {
    _pipelinePromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers")
      env.useBrowserCache = false
      env.allowLocalModels = false
      env.allowRemoteModels = true
      env.cacheDir = '/tmp/transformers-cache'
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
    })()
  }
  return _pipelinePromise
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

    // Check Redis cache
    const skillsHash = hashKey(JSON.stringify(skills))
    const redisCacheKey = cacheKey('skills:v2', skillsHash)
    const cached = await cacheGet<{ categorizedSkills: any[] }>(redisCacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    let embedder: Awaited<ReturnType<typeof getEmbedder>>
    try {
      embedder = await getEmbedder()
    } catch (embedderError) {
      console.error('Categorize embedder init failed:', embedderError)
      const categorizedSkills = (skills as Skill[]).slice(0, 8).map(s => ({
        name: s.name,
        level: Math.min(95, Math.max(70, s.level ?? 70)),
        category: s.category || 'Other',
        subSkills: [s.name],
        calculation: s.calculation,
      })).sort((a, b) => b.level - a.level)
      return NextResponse.json({ categorizedSkills })
    }

    const cosineSimilarity = (a: number[], b: number[]): number => {
      if (a.length !== b.length) return 0
      let dotProduct = 0
      let normA = 0
      let normB = 0
      
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
      }
      
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
    }

    // Serialize embedding calls to avoid concurrent LevelDB writes
    const skillEmbeddings: ({ skill: Skill; embedding: any } | null)[] = []
    for (const skill of skills as Skill[]) {
      try {
        const embedding = await embedder(skill.name, { pooling: 'mean', normalize: true })
        skillEmbeddings.push({ skill, embedding })
      } catch {
        skillEmbeddings.push(null)
      }
    }

    // Filter out failed embeddings
    const validSkillEmbeddings = skillEmbeddings.filter((item): item is { skill: Skill; embedding: any } => item !== null && item !== undefined)
    
    if (validSkillEmbeddings.length === 0) {
      throw new Error('No valid embeddings generated')
    }

    // LEVEL 1: Group similar skills into broader categories using semantic similarity
    const skillGroups: { [broaderSkill: string]: { skills: Skill[], totalLevel: number, calculation: any, representativeName: string } } = {}
    const processedSkills = new Set<string>()

    validSkillEmbeddings.forEach(({ skill, embedding }) => {
      if (processedSkills.has(skill.name)) return

      const similarSkills = [skill]
      processedSkills.add(skill.name)

      // Find similar skills based on cosine similarity for broader grouping
      validSkillEmbeddings.forEach(({ skill: otherSkill, embedding: otherEmbedding }) => {
        if (skill.name === otherSkill.name || processedSkills.has(otherSkill.name)) return

        try {
          const similarity = cosineSimilarity(
            Array.from(embedding.data), 
            Array.from(otherEmbedding.data)
          )
          
          // Higher threshold for broader grouping (more similar skills grouped together)
          if (similarity > 0.85) {
            similarSkills.push(otherSkill)
            processedSkills.add(otherSkill.name)
          }
        } catch {
          // Handle similarity calculation error
        }
      })

      // Use the most representative skill name as the broader category
      // (could be the one with highest level or most common)
      const representativeName = similarSkills.reduce((best, current) => 
        current.level > best.level ? current : best
      ).name
      
      const totalLevel = similarSkills.reduce((sum, s) => sum + s.level, 0)
      
      // Aggregate calculation data
      const aggregatedCalculation = {
        frequency: 0,
        maxFrequency: 0,
        sources: [] as string[],
        breakdown: {
          projects: 0,
          experience: 0,
          resumeSkills: 0
        }
      }
      
      similarSkills.forEach(s => {
        if (s.calculation) {
          aggregatedCalculation.frequency += s.calculation.frequency
          aggregatedCalculation.maxFrequency += s.calculation.maxFrequency
          aggregatedCalculation.breakdown.projects += s.calculation.breakdown.projects
          aggregatedCalculation.breakdown.experience += s.calculation.breakdown.experience
          aggregatedCalculation.breakdown.resumeSkills += s.calculation.breakdown.resumeSkills
          aggregatedCalculation.sources.push(...s.calculation.sources)
        }
      })
      
      skillGroups[representativeName] = {
        skills: similarSkills,
        totalLevel: totalLevel,
        calculation: {
          ...aggregatedCalculation,
          sources: Array.from(new Set(aggregatedCalculation.sources))
        },
        representativeName
      }
    })

    // LEVEL 2: Categorize skill groups into domains.
    // Path A: If skills already carry category fields, use majority vote.
    // Path B: If no categories exist, discover them via embedding clustering.

    const hasExistingCategories = Object.values(skillGroups).some(
      group => group.skills.some(s => s.category && s.category !== 'Other')
    )

    // Get embeddings for each broader skill group (needed for both paths)
    const groupEntries = Object.entries(skillGroups)
    const groupEmbeddings = await Promise.all(
      groupEntries.map(async ([name]) => {
        const match = validSkillEmbeddings.find(item => item.skill.name === name)
        if (match) return { name, embedding: match.embedding }
        try {
          const embedding = await embedder(name, { pooling: 'mean', normalize: true })
          return { name, embedding }
        } catch {
          return null
        }
      })
    )
    const validGroupEmbeddings = groupEmbeddings.filter((g): g is { name: string; embedding: any } => g !== null)

    let groupCategoryMap: Map<string, string>

    if (hasExistingCategories) {
      // PATH A: Use existing category fields — majority vote per group,
      // nearest-neighbor fallback for uncategorized groups.
      const observedCategories = new Set<string>()
      for (const group of Object.values(skillGroups)) {
        for (const s of group.skills) {
          if (s.category && s.category !== 'Other') observedCategories.add(s.category)
        }
      }

      const categoryEmbeddings: { category: string; embedding: any }[] = []
      for (const cat of Array.from(observedCategories)) {
        try {
          const embedding = await embedder(cat, { pooling: 'mean', normalize: true })
          categoryEmbeddings.push({ category: cat, embedding })
        } catch { /* skip */ }
      }

      groupCategoryMap = new Map()
      for (const [broaderSkill, group] of groupEntries) {
        const catCounts = new Map<string, number>()
        for (const s of group.skills) {
          if (s.category && s.category !== 'Other') {
            catCounts.set(s.category, (catCounts.get(s.category) || 0) + 1)
          }
        }

        if (catCounts.size > 0) {
          const winner = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
          groupCategoryMap.set(broaderSkill, winner)
        } else if (categoryEmbeddings.length > 0) {
          const ge = validGroupEmbeddings.find(g => g.name === broaderSkill)
          if (ge) {
            let bestSim = 0
            let bestCat = 'Other'
            for (const { category, embedding } of categoryEmbeddings) {
              try {
                const sim = cosineSimilarity(Array.from(ge.embedding.data), Array.from(embedding.data))
                if (sim > bestSim) { bestSim = sim; bestCat = category }
              } catch { /* skip */ }
            }
            groupCategoryMap.set(broaderSkill, bestCat)
          } else {
            groupCategoryMap.set(broaderSkill, 'Other')
          }
        } else {
          groupCategoryMap.set(broaderSkill, 'Other')
        }
      }
    } else {
      // PATH B: No categories on any skill — discover clusters dynamically.
      // Greedy agglomerative clustering: start each group as its own cluster,
      // merge the two most similar clusters until we hit a similarity floor.
      const CLUSTER_THRESHOLD = 0.55
      const MAX_CLUSTERS = 8

      type Cluster = { members: string[]; centroid: number[] }
      const clusters: Cluster[] = validGroupEmbeddings.map(g => ({
        members: [g.name],
        centroid: Array.from(g.embedding.data) as number[],
      }))

      const averageVectors = (a: number[], b: number[], wA: number, wB: number): number[] => {
        const total = wA + wB
        return a.map((v, i) => (v * wA + b[i] * wB) / total)
      }

      // Merge until no pair exceeds threshold or we hit max clusters
      while (clusters.length > MAX_CLUSTERS) {
        let bestI = -1, bestJ = -1, bestSim = -1
        for (let i = 0; i < clusters.length; i++) {
          for (let j = i + 1; j < clusters.length; j++) {
            const sim = cosineSimilarity(clusters[i].centroid, clusters[j].centroid)
            if (sim > bestSim) { bestSim = sim; bestI = i; bestJ = j }
          }
        }
        if (bestSim < CLUSTER_THRESHOLD) break
        const merged: Cluster = {
          members: [...clusters[bestI].members, ...clusters[bestJ].members],
          centroid: averageVectors(
            clusters[bestI].centroid, clusters[bestJ].centroid,
            clusters[bestI].members.length, clusters[bestJ].members.length
          ),
        }
        clusters.splice(bestJ, 1)
        clusters.splice(bestI, 1, merged)
      }

      // Embed each SKILL_CATEGORIES value so we can match clusters to real domain labels
      const categoryLabels = Object.values(SKILL_CATEGORIES)
      const categoryEmbeddings: { label: string; vec: number[] }[] = []
      for (const label of categoryLabels) {
        try {
          const emb = await embedder(label, { pooling: 'mean', normalize: true })
          categoryEmbeddings.push({ label, vec: Array.from(emb.data) as number[] })
        } catch { /* skip */ }
      }

      groupCategoryMap = new Map()
      for (const cluster of clusters) {
        let bestLabel = 'Other'
        let bestSim = -1
        for (const { label, vec } of categoryEmbeddings) {
          const sim = cosineSimilarity(cluster.centroid, vec)
          if (sim > bestSim) { bestSim = sim; bestLabel = label }
        }
        for (const member of cluster.members) {
          groupCategoryMap.set(member, bestLabel)
        }
      }
    }

    const categorizedSkills = groupEntries.map(([broaderSkill, group]) => {
      const maxLevel = Math.max(...group.skills.map(s => s.level))
      return {
        name: broaderSkill,
        level: Math.min(95, Math.max(70, maxLevel)),
        category: groupCategoryMap.get(broaderSkill) || 'Other',
        subSkills: group.skills.map(s => s.name),
        calculation: group.calculation
      }
    }).sort((a, b) => b.level - a.level).slice(0, 8)

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
