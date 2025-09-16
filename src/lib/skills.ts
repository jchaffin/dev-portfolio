import { Skill } from '@/types'
import resumeData from '@/data/resume.json'

export type ProjectForSkills = {
  title: string;
  description: string;
  tech: string[];
};

export const getDynamicSkills = (baseSkills: Skill[], githubProjects: ProjectForSkills[] = []): Skill[] => {
  const skillsWithLevels = baseSkills.map((skill) => {
    let frequency = 0;
    const breakdown = {
      projects: 0,
      experience: 0,
      resumeSkills: 0,
    };
    const sources: string[] = [];

    const skillLower = skill.name.toLowerCase();

    // Count frequency in GitHub projects
    githubProjects.forEach((project) => {
      const projectText = `${project.title} ${project.description} ${project.tech.join(' ')}`.toLowerCase();

      if (projectText.includes(skillLower)) {
        frequency += 1;
        breakdown.projects += 1;
        sources.push(`GitHub Project: ${project.title}`);
      }

      if (project.tech.some((tech: string) => tech.toLowerCase().includes(skillLower))) {
        frequency += 2;
        breakdown.projects += 2;
        sources.push(`GitHub Project Tech: ${project.title}`);
      }
    });

    // Count frequency in resume experience
    resumeData.experience?.forEach((exp) => {
      const expText = `${exp.role} ${exp.description} ${(exp.keywords || []).join(' ')}`.toLowerCase();

      if (expText.includes(skillLower)) {
        frequency += 1;
        breakdown.experience += 1;
        sources.push(`Experience: ${exp.role} at ${exp.company}`);
      }

      if (exp.keywords?.some((keyword) => keyword.toLowerCase().includes(skillLower))) {
        frequency += 2;
        breakdown.experience += 2;
        sources.push(`Experience Keywords: ${exp.role}`);
      }
    });

    // Count frequency in resume skills
    if (resumeData.skills?.some((resumeSkill) => resumeSkill.toLowerCase().includes(skillLower))) {
      frequency += 3;
      breakdown.resumeSkills += 3;
      sources.push('Resume Skills');
    }

    const maxFrequency = githubProjects.length * 3 + (resumeData.experience?.length || 0) * 3 + 3;
    const level = Math.min(95, Math.max(70, Math.round(70 + (frequency / Math.max(maxFrequency, 1)) * 25)));

    return {
      ...skill,
      level,
      calculation: {
        frequency,
        maxFrequency,
        sources: Array.from(new Set(sources)),
        breakdown,
      },
    };
  });

  return skillsWithLevels;
};


