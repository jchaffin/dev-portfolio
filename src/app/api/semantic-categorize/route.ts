import { NextRequest, NextResponse } from 'next/server'

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
    const { skills } = await request.json()

    // Dynamic import on server side
    const { pipeline, env } = await import("@xenova/transformers")
    
    // Set environment for server-side
    env.useBrowserCache = false
    env.allowLocalModels = true
    env.allowRemoteModels = true
    
    // Custom cosine similarity function
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

    const embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    )

    // Get embeddings for all skills
    const skillEmbeddings = await Promise.all(
      skills.map(async (skill: Skill) => {
        try {
          const embedding = await embedder(skill.name, { pooling: 'mean', normalize: true })
          return { skill, embedding }
        } catch {
          // Handle embedding error
        }
      })
    )

    // Filter out failed embeddings
    const validSkillEmbeddings = skillEmbeddings.filter(item => item !== null)
    
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

    // LEVEL 2: Categorize broader skill groups into domains using semantic analysis
    const broaderSkillNames = Object.keys(skillGroups)
    const broaderSkillEmbeddings = await Promise.all(
      broaderSkillNames.map(async (skillName) => {
        try {
          const embedding = await embedder(skillName, { pooling: 'mean', normalize: true })
          return { skillName, embedding }
        } catch {
          // Handle embedding error
        }
      })
    )

    const validBroaderEmbeddings = broaderSkillEmbeddings.filter((item): item is { skillName: string; embedding: any } => item !== null && item !== undefined)

    // Define domain categories with semantic descriptions
    const domainCategories = [
      { name: 'Frontend', description: 'frontend web development user interface client-side' },
      { name: 'Backend', description: 'backend server-side development api database' },
      { name: 'AI/ML', description: 'artificial intelligence machine learning data science' },
      { name: 'DevOps', description: 'devops infrastructure deployment cloud' },
      { name: 'Mobile', description: 'mobile app development ios android' },
      { name: 'Database', description: 'database management storage data' }
    ]

    // Get embeddings for domain categories
    const domainEmbeddings = await Promise.all(
      domainCategories.map(async (domain) => {
        try {
          const embedding = await embedder(domain.description, { pooling: 'mean', normalize: true })
          return { domain: domain.name, embedding }
        } catch {
          return null
        }
      })
    )

    const validDomainEmbeddings = domainEmbeddings.filter((item): item is { domain: string; embedding: any } => item !== null && item !== undefined)

    // Categorize each broader skill group into the most similar domain
    const categorizedSkills = Object.entries(skillGroups).map(([broaderSkill, group]) => {
      // Use the highest level in the group instead of averaging
      const maxLevel = Math.max(...group.skills.map(s => s.level))
      
      // Find the most similar domain for this broader skill
      const broaderEmbedding = validBroaderEmbeddings.find(item => item?.skillName === broaderSkill)
      let bestCategory = 'Other'
      let bestSimilarity = 0
      
      if (broaderEmbedding) {
        validDomainEmbeddings.forEach(({ domain, embedding }) => {
          try {
            const similarity = cosineSimilarity(
              Array.from(broaderEmbedding.embedding.data),
              Array.from(embedding.data)
            )
            
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity
              bestCategory = domain
            }
          } catch {
            // Handle domain similarity calculation error
          }
        })
      }
      
      return {
        name: broaderSkill,
        level: Math.min(95, Math.max(70, maxLevel)),
        category: bestCategory,
        subSkills: group.skills.map(s => s.name), // Keep track of original skills
        calculation: group.calculation
      }
    }).sort((a, b) => b.level - a.level).slice(0, 8)

    return NextResponse.json({ categorizedSkills })
  } catch {
    // Handle overall error
  }
}
