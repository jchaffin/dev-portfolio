'use client'

import { useState, useEffect } from 'react'

interface Skill {
  name: string
  level: number
  category: string
}

interface SemanticCategorizerProps {
  skills: Skill[]
  onCategorized: (_categorizedSkills: Skill[]) => void
}

const SemanticCategorizer = ({ skills, onCategorized }: SemanticCategorizerProps) => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const categorizeSkills = async () => {
      try {
        // Call server API for semantic categorization
        const response = await fetch('/api/semantic-categorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ skills }),
        })

        if (!response.ok) {
          throw new Error('Server request failed')
        }

        const { categorizedSkills } = await response.json()
        onCategorized(categorizedSkills)
      } catch {
        // Return original skills if semantic categorization fails
        onCategorized(skills.slice(0, 8))
      } finally {
        setIsLoading(false)
      }
    }

    categorizeSkills()
  }, [skills, onCategorized])

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-theme-primary mx-auto"></div>
        <p className="mt-4 text-theme-secondary">Categorizing skills...</p>
      </div>
    )
  }

  return null
}

export default SemanticCategorizer
