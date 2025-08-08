import { Skill, Project } from '@/types'
import { PROJECT_CATEGORIES } from '@/lib/constants'
import resumeData from './sample-resume.json'

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
  
  return Math.round(percentage);
};



// Extract skills from resume data and map them to Skill objects
const extractSkillsFromResume = (): Skill[] => {
  const resumeSkills = resumeData.skills || [];
  


  // Create Skill objects from resume skills with dynamic levels (no hardcoded categories)
  const skillsFromResume = resumeSkills.map(skillName => {
    return {
      name: skillName,
      level: calculateSkillLevel(skillName),
      category: 'Other' // Will be categorized by semantic analysis
    };
  });

  // Add additional skills from experience keywords
  const allKeywords = resumeData.experience?.flatMap(exp => exp.keywords || []) || [];
  const additionalSkills = allKeywords
    .filter(keyword => !resumeSkills.includes(keyword))
    .map(keyword => {
      return {
        name: keyword,
        level: calculateSkillLevel(keyword),
        category: 'Other' // Will be categorized by semantic analysis
      };
    });

  // Combine and remove duplicates
  const allSkills = [...skillsFromResume, ...additionalSkills];
  const uniqueSkills = allSkills.filter((skill, index, self) => 
    index === self.findIndex(s => s.name === skill.name)
  );

  return uniqueSkills.sort((a, b) => b.level - a.level);
};

export const projects: Project[] = [
  {
    id: 1,
    title: 'E-commerce Platform',
    description: 'Full-stack e-commerce solution with payment integration, inventory management, and admin dashboard. Features include user authentication, shopping cart, order tracking, and real-time inventory updates.',
    tech: ['Next.js', 'Prisma', 'PostgreSQL', 'Stripe', 'Tailwind CSS', 'NextAuth'],
    github: 'https://github.com/yourusername/ecommerce',
    live: 'https://ecommerce-demo.vercel.app',
    featured: true,
    category: PROJECT_CATEGORIES.FULLSTACK,
    image: '/images/ecommerce-preview.jpg'
  },
  {
    id: 2,
    title: 'Real-time Chat Application',
    description: 'WebSocket-based chat application with private rooms, file sharing, message encryption, and real-time notifications. Built with modern web technologies for seamless user experience.',
    tech: ['React', 'Socket.io', 'Express', 'MongoDB', 'JWT', 'Cloudinary'],
    github: 'https://github.com/yourusername/chat-app',
    live: 'https://chat-app-demo.vercel.app',
    featured: true,
    category: PROJECT_CATEGORIES.FULLSTACK,
    image: '/images/chat-preview.jpg'
  },
  {
    id: 3,
    title: 'Task Management API',
    description: 'RESTful API with comprehensive authentication, CRUD operations, role-based access control, and extensive testing. Includes API documentation with Swagger.',
    tech: ['Node.js', 'Express', 'PostgreSQL', 'Jest', 'Swagger', 'JWT'],
    github: 'https://github.com/yourusername/task-api',
    live: 'https://task-api-docs.vercel.app',
    featured: false,
    category: PROJECT_CATEGORIES.BACKEND,
    image: '/images/api-preview.jpg'
  },
  {
    id: 4,
    title: 'Weather Dashboard',
    description: 'Dynamic weather application with location services, 7-day forecasts, interactive charts, and weather alerts. Features responsive design and offline capabilities.',
    tech: ['React', 'Chart.js', 'OpenWeather API', 'PWA', 'Service Worker'],
    github: 'https://github.com/yourusername/weather-dashboard',
    live: 'https://weather-dashboard-demo.vercel.app',
    featured: false,
    category: PROJECT_CATEGORIES.FRONTEND,
    image: '/images/weather-preview.jpg'
  },
  {
    id: 5,
    title: 'Blog CMS Platform',
    description: 'Content management system with markdown support, SEO optimization, analytics dashboard, and multi-user collaboration. Features automated deployment and content versioning.',
    tech: ['Next.js', 'MDX', 'Prisma', 'NextAuth', 'Vercel', 'Google Analytics'],
    github: 'https://github.com/yourusername/blog-cms',
    live: 'https://blog-cms-demo.vercel.app',
    featured: false,
    category: PROJECT_CATEGORIES.FULLSTACK,
    image: '/images/blog-preview.jpg'
  },
  {
    id: 6,
    title: 'Cryptocurrency Tracker',
    description: 'Real-time cryptocurrency price tracking application with portfolio management, price alerts, and historical data visualization. Integrates with multiple crypto APIs.',
    tech: ['React', 'Redux', 'Chart.js', 'CoinGecko API', 'Firebase'],
    github: 'https://github.com/yourusername/crypto-tracker',
    live: 'https://crypto-tracker-demo.vercel.app',
    featured: false,
    category: PROJECT_CATEGORIES.FRONTEND,
    image: '/images/crypto-preview.jpg'
  }
]

// Extract experiences from resume data
const extractExperiencesFromResume = () => {
  return resumeData.experience?.map((exp, index) => ({
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