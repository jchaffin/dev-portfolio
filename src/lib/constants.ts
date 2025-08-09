export const SITE_CONFIG = {
  name: "Jacob Chaffin",
  title: "Devfolio",
  description: "Site",
  url: "https://jacobchaffin.com",
  ogImage: "https://jacobchaffin.com/og.jpg",
  creator: "@jacobchaffin",
  keywords: [
    "fullstack developer",
    "web developer",
    "react",
    "nextjs",
    "typescript",
    "portfolio",
    "javascript",
    "node.js",
    "frontend",
    "backend"
  ]
}

export const SOCIAL_LINKS = {
  github: "https://github.com/jacobchaffin",
  linkedin: "https://linkedin.com/in/jacobchaffin",
  twitter: "https://twitter.com/jchaffin",
  email: "jchaffin57@gmail.com"
}

export const NAVIGATION_ITEMS = [
  { name: "About", href: "#about" },
  { name: "Skills", href: "#skills" },
  { name: "Projects", href: "#projects" },
  { name: "Contact", href: "#contact" }
]

export const SKILL_CATEGORIES = {
  FRONTEND: "Frontend",
  BACKEND: "Backend", 
  DATABASE: "Database",
  DEVOPS: "DevOps",
  LANGUAGE: "Language",
  API: "API",
  TOOLS: "Tools"
} as const

export const PROJECT_CATEGORIES = {
  FRONTEND: "frontend",
  BACKEND: "backend",
  FULLSTACK: "fullstack",
  MOBILE: "mobile"
} as const

// Voice AI Constants
export const VOICE_AI_CONSTANTS = {
  TOP_SKILLS_COUNT: 8,
  INITIAL_GREETING_DELAY: 1000,
  AUDIO_VOLUME: 1.0,
  DEFAULT_CODEC: 'opus',
} as const;

export const SESSION_STATUS = {
  CONNECTED: 'CONNECTED' as const,
  CONNECTING: 'CONNECTING' as const,
  DISCONNECTED: 'DISCONNECTED' as const,
} as const;

// Local Projects Data
export const LOCAL_PROJECTS = [
  {
    title: 'Real-time Chat Application',
    description: 'WebSocket-based chat app with rooms, file sharing, and message encryption.',
    tech: ['React', 'Socket.io', 'Express', 'MongoDB', 'JWT'],
    github: 'https://github.com/jchaffin/chat-app',
    live: 'https://chat-app-demo.vercel.app',
  },
  {
    title: 'Task Management API',
    description: 'RESTful API with authentication, CRUD operations, and comprehensive testing.',
    tech: ['Node.js', 'Express', 'PostgreSQL', 'Jest', 'Swagger'],
    github: 'https://github.com/jchaffin/task-api',
    live: 'https://task-api-docs.vercel.app',
  },
  {
    title: 'Weather Dashboard',
    description: 'Dynamic weather app with location services, forecasts, and data visualization.',
    tech: ['React', 'Chart.js', 'OpenWeather API', 'Geolocation'],
    github: 'https://github.com/jchaffin/weather-dashboard',
    live: 'https://weather-dashboard-demo.vercel.app',
  }
];