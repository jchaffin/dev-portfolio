import { Skill, Project } from '@/types'
import { SKILL_CATEGORIES, PROJECT_CATEGORIES } from '@/lib/constants'

export const skills: Skill[] = [
  { name: 'React/Next.js', level: 95, category: SKILL_CATEGORIES.FRONTEND },
  { name: 'TypeScript', level: 90, category: SKILL_CATEGORIES.LANGUAGE },
  { name: 'Node.js', level: 88, category: SKILL_CATEGORIES.BACKEND },
  { name: 'PostgreSQL', level: 85, category: SKILL_CATEGORIES.DATABASE },
  { name: 'AWS/Cloud', level: 82, category: SKILL_CATEGORIES.DEVOPS },
  { name: 'Docker', level: 80, category: SKILL_CATEGORIES.DEVOPS },
  { name: 'GraphQL', level: 75, category: SKILL_CATEGORIES.API },
  { name: 'Python', level: 78, category: SKILL_CATEGORIES.LANGUAGE },
  { name: 'MongoDB', level: 80, category: SKILL_CATEGORIES.DATABASE },
  { name: 'Redis', level: 75, category: SKILL_CATEGORIES.DATABASE },
  { name: 'Tailwind CSS', level: 92, category: SKILL_CATEGORIES.FRONTEND },
  { name: 'Express.js', level: 85, category: SKILL_CATEGORIES.BACKEND },
]

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

export const experiences = [
  {
    id: 1,
    company: 'Tech Startup Inc.',
    position: 'Senior Fullstack Developer',
    duration: '2022 - Present',
    location: 'San Francisco, CA',
    type: 'full-time' as const,
    description: [
      'Led development of core platform features serving 100k+ users',
      'Architected microservices infrastructure reducing response times by 40%',
      'Mentored junior developers and established coding standards',
      'Implemented CI/CD pipelines improving deployment frequency by 300%'
    ],
    technologies: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes']
  },
  {
    id: 2,
    company: 'Digital Agency',
    position: 'Frontend Developer',
    duration: '2020 - 2022',
    location: 'Remote',
    type: 'full-time' as const,
    description: [
      'Built responsive web applications for Fortune 500 clients',
      'Improved site performance resulting in 25% increase in conversions',
      'Collaborated with design teams to implement pixel-perfect UIs',
      'Integrated third-party APIs and payment systems'
    ],
    technologies: ['React', 'TypeScript', 'Sass', 'Webpack', 'Jest']
  }
]