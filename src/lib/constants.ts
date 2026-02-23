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
  { name: "Voice", href: "#voice" },
  { name: "Contact", href: "#contact" }
]

export const SKILL_CATEGORIES = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  AI_ML: "AI & Machine Learning",
  INFRASTRUCTURE: "Infrastructure & Real-time",
  DEVOPS: "DevOps & Cloud",
  LANGUAGES: "Programming Languages",
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
