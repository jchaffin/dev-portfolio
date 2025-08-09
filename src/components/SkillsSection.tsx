'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { skills as portfolioSkills, projects } from '@/data/portfolio'
import { Skill } from '@/types'
import resumeData from '@/data/sample-resume.json'
import { getProjects, type Project } from '@/lib/getProjects'

// Calculate skill level based on frequency in projects and resume
const calculateSkillLevel = (skillName: string): number => {
  let frequency = 0;
  let maxFrequency = 0;
  
  // Count frequency in projects
  projects.forEach(project => {
    const projectText = `${project.title} ${project.description} ${project.tech.join(' ')}`.toLowerCase();
    const skillLower = skillName.toLowerCase();
    
    // Check for exact matches and partial matches
    if (projectText.includes(skillLower)) {
      frequency += 1;
    }
    
    // Check tech array specifically (higher weight)
    if (project.tech.some(tech => tech.toLowerCase().includes(skillLower))) {
      frequency += 2;
    }
  });
  
  // Count frequency in resume experience
  resumeData.experience?.forEach(exp => {
    const expText = `${exp.role} ${exp.description} ${(exp.keywords || []).join(' ')}`.toLowerCase();
    const skillLower = skillName.toLowerCase();
    
    if (expText.includes(skillLower)) {
      frequency += 1;
    }
    
    // Check keywords specifically (higher weight)
    if (exp.keywords?.some(keyword => keyword.toLowerCase().includes(skillLower))) {
      frequency += 2;
    }
  });
  
  // Count frequency in resume skills (highest weight)
  if (resumeData.skills?.some(skill => skill.toLowerCase().includes(skillName.toLowerCase()))) {
    frequency += 3;
  }
  
  // Calculate max possible frequency for normalization
  maxFrequency = (projects.length * 3) + (resumeData.experience?.length || 0) * 3 + 3;
  
  // Convert to percentage (70-95 range for realistic levels)
  const percentage = Math.min(95, Math.max(70, 70 + (frequency / maxFrequency) * 25));
  
  return Math.round(percentage);
};

// Get dynamic skills with calculated levels and calculation data
const getDynamicSkills = (githubProjects: Project[] = []): Skill[] => {
  // Calculate levels for all skills first with calculation data
  const skillsWithLevels = portfolioSkills.map(skill => {
    const level = calculateSkillLevel(skill.name)
    
    // Calculate frequency data for the formula
    let frequency = 0
    let breakdown = {
      projects: 0,
      experience: 0,
      resumeSkills: 0
    }
    const sources: string[] = []
    
    // Count frequency in GitHub projects
    githubProjects.forEach(project => {
      const projectText = `${project.title} ${project.description} ${project.tech.join(' ')}`.toLowerCase()
      const skillLower = skill.name.toLowerCase()
      
      if (projectText.includes(skillLower)) {
        frequency += 1
        breakdown.projects += 1
        sources.push(`GitHub Project: ${project.title}`)
      }
      
      if (project.tech.some((tech: string) => tech.toLowerCase().includes(skillLower))) {
        frequency += 2
        breakdown.projects += 2
        sources.push(`GitHub Project Tech: ${project.title}`)
      }
    })
    
    // Count frequency in resume experience
    resumeData.experience?.forEach(exp => {
      const expText = `${exp.role} ${exp.description} ${(exp.keywords || []).join(' ')}`.toLowerCase()
      const skillLower = skill.name.toLowerCase()
      
      if (expText.includes(skillLower)) {
        frequency += 1
        breakdown.experience += 1
        sources.push(`Experience: ${exp.role} at ${exp.company}`)
      }
      
      if (exp.keywords?.some(keyword => keyword.toLowerCase().includes(skillLower))) {
        frequency += 2
        breakdown.experience += 2
        sources.push(`Experience Keywords: ${exp.role}`)
      }
    })
    
    // Count frequency in resume skills
    if (resumeData.skills?.some(resumeSkill => resumeSkill.toLowerCase().includes(skill.name.toLowerCase()))) {
      frequency += 3
      breakdown.resumeSkills += 3
      sources.push('Resume Skills')
    }
    
    const maxFrequency = (githubProjects.length * 3) + (resumeData.experience?.length || 0) * 3 + 3
    
    return {
      ...skill,
      level,
      calculation: {
        frequency,
        maxFrequency,
        sources: Array.from(new Set(sources)),
        breakdown
      }
    }
  })
  
  return skillsWithLevels
}

const getCategoryColor = (category: string) => {
  // Simple hash-based color generation for semantic categories
  const hash = category.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const colors = [
    'from-green-500 to-emerald-500',
    'from-yellow-500 to-orange-500', 
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-indigo-500 to-purple-500',
    'from-red-500 to-pink-500',
    'from-teal-500 to-green-500',
    'from-pink-500 to-rose-500',
    'from-violet-500 to-purple-500',
    'from-amber-500 to-orange-500'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

const SkillCard = ({ skill, index }: { skill: Skill, index: number }) => {

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      className="rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-theme-primary bg-theme-primary"
    >
    {/* Category Badge and Percentage Display */}
    <div className="flex items-center justify-between mb-4">
      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getCategoryColor(skill.category)} text-white`}>
        {skill.category}
      </span>
      <span className="text-2xl font-bold text-theme-primary">
        {skill.level}%
      </span>
    </div>

    {/* Skill Name */}
    <h3 className="text-lg font-bold mb-4 text-theme-primary">
      {skill.name}
    </h3>

    {/* Progress Bar Container */}
    <div className="relative">
      {/* Background Bar */}
      <div className="w-full rounded-full h-3 overflow-hidden bg-theme-secondary">
        {/* Animated Progress Bar */}
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${skill.level}%` }}
          viewport={{ once: true }}
          transition={{ 
            duration: 1.5, 
            delay: index * 0.1 + 0.3,
            ease: "easeOut"
          }}
          className={`h-full bg-gradient-to-r ${getCategoryColor(skill.category)} rounded-full relative overflow-hidden`}
        >
          {/* Shimmer Effect */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 1.5,
              delay: index * 0.1 + 0.5,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
      </div>

      {/* Progress Indicator Dots */}
      <div className="flex justify-between mt-2 px-1">
        {[25, 50, 75, 100].map((mark) => (
          <div
            key={mark}
            className={`w-1 h-1 rounded-full transition-colors duration-500 bg-theme-secondary`}
          />
        ))}
      </div>
    </div>

    {/* Skill Level Description */}
    <div className="mt-3">
      <span className={`text-xs font-medium text-theme-secondary`}>
        {skill.level >= 90 ? 'Expert' :
         skill.level >= 80 ? 'Advanced' :
         skill.level >= 70 ? 'Intermediate' :
         'Beginner'}
      </span>
    </div>


  </motion.div>
  )
}

const SkillsSection = () => {
  // Get skills with semantic categorization
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormula, setShowFormula] = useState(false);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        // Fetch GitHub projects first
        const githubProjects = await getProjects();
        const initialSkills = getDynamicSkills(githubProjects);
        
        // Call the semantic categorization API
        const response = await fetch('/api/semantic-categorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ skills: initialSkills }),
        });

        if (response.ok) {
          const { categorizedSkills } = await response.json();
          setSkills(categorizedSkills);
        } else {
          // Fallback to original skills if API fails
          setSkills(initialSkills.slice(0, 8));
        }
      } catch {
        // Handle error loading skills
      } finally {
        setIsLoading(false);
      }
    };

    loadSkills();
  }, []); // Only run once on mount

  if (isLoading) {
    return (
      <section id="skills" className="py-20 bg-theme-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-theme-primary mx-auto"></div>
            <p className="mt-4 text-theme-secondary">Loading skills...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="skills" className="py-20 bg-theme-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 text-theme-primary">
            Technical Skills
          </h2>
          <p className="max-w-2xl mx-auto text-theme-secondary mb-4">
            
          </p>
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="text-sm text-theme-secondary hover:text-theme-primary transition-colors underline"
          >
            How is score calculated?
          </button>
        </motion.div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {skills.map((skill, index) => (
            <SkillCard key={skill.name} skill={skill} index={index} />
          ))}
        </div>

        {/* Formula Popup */}
        {showFormula && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFormula(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-theme-primary rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-theme-primary">How Skills Are Calculated</h3>
                <button
                  onClick={() => setShowFormula(false)}
                  className="text-theme-secondary hover:text-theme-primary"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-sm text-theme-secondary space-y-4">
                <div>
                  <h4 className="font-semibold text-theme-primary mb-2">Algorithm:</h4>
                  <p>Frequency-based skill level calculation using weighted scoring across multiple data sources</p>
                </div>

                <div>
                  <h4 className="font-semibold text-theme-primary mb-2">Formula:</h4>
                  <p className="font-mono bg-theme-secondary/10 p-2 rounded">Level = 70 + (frequency / maxFrequency) × 25</p>
                  <p className="text-xs opacity-75 mt-1">Range: 70-95%</p>
                </div>

                <div>
                  <h4 className="font-semibold text-theme-primary mb-2">Scoring Weights:</h4>
                  <ul className="space-y-1">
                    <li>• GitHub Project Description: +1 point</li>
                    <li>• GitHub Project Tech Tags: +2 points</li>
                    <li>• Experience Description: +1 point</li>
                    <li>• Experience Keywords: +2 points</li>
                    <li>• Resume Skills List: +3 points</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-theme-primary mb-2">Data Sources:</h4>
                  <ul className="space-y-1">
                    <li>• GitHub repositories (last year)</li>
                    <li>• Resume experience descriptions</li>
                    <li>• Resume skills list</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-theme-primary mb-2">Categorization:</h4>
                  <p>Skills are semantically grouped using embeddings and cosine similarity, then categorized into domains (Frontend, Backend, AI/ML, DevOps, etc.)</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  )
}

export default SkillsSection