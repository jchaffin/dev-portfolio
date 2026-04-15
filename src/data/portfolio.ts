import { Skill, Project } from '@/types'
import { PROJECT_CATEGORIES } from '@/lib/constants'
import resumeData from './resume.json'

// Calculate skill level based on frequency in resume experience only (avoiding circular dependency)
const calculateSkillLevel = (skillName: string): number => {
  let frequency = 0;
  let maxFrequency = 0;
  
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
  maxFrequency = (resumeData.experience?.length || 0) * 3 + 3;
  
  // Convert to percentage (70-95 range for realistic levels)
  const percentage = Math.min(95, Math.max(70, 70 + (frequency / maxFrequency) * 25));

  // Enforce minimum levels for key skills where real proficiency is higher
  const minimumSkillLevels: Record<string, number> = {
    'react': 92,
  };

  const minOverride = minimumSkillLevels[skillName.toLowerCase()];
  const adjusted = minOverride ? Math.max(percentage, minOverride) : percentage;

  return Math.round(adjusted);
};

const extractSkillsFromResume = (): Skill[] => {
  const resumeSkills = resumeData.skills || [];

  const skillsFromResume = resumeSkills.map(skillName => ({
    name: skillName,
    level: calculateSkillLevel(skillName),
    category: 'Other',
  }));

  const allKeywords = resumeData.experience?.flatMap(exp => exp.keywords || []) || [];
  const additionalSkills = allKeywords
    .filter(keyword => !resumeSkills.includes(keyword))
    .map(keyword => ({
      name: keyword,
      level: calculateSkillLevel(keyword),
      category: 'Other',
    }));

  // Combine and remove duplicates
  const allSkills = [...skillsFromResume, ...additionalSkills];
  const uniqueSkills = allSkills.filter((skill, index, self) => 
    index === self.findIndex(s => s.name === skill.name)
  );

  return uniqueSkills.sort((a, b) => b.level - a.level);
};

// Projects are now fetched dynamically from GitHub API via getProjects()
// See: /api/projects and src/lib/getProjects.ts

// Extract experiences from resume data
const extractExperiencesFromResume = () => {
  return resumeData.experience
    ?.filter(exp => (exp as { engagement?: string }).engagement !== 'owned_product')
    .map((exp, index) => ({
      id: index + 1,
      company: exp.company,
      position: exp.role,
      duration: exp.duration,
      location: exp.location,
      type: 'full-time' as const,
      description: exp.description.split('. ').filter(sentence => sentence.trim().length > 0),
      technologies: exp.keywords || []
    })) || [];
};

export const experiences = extractExperiencesFromResume();

export const skills: Skill[] = extractSkillsFromResume();