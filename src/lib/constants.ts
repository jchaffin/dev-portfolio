export const SITE_CONFIG = {
  name: "Jacob CHaffin",
  title: "Fullstack Developer Portfolio",
  description: "A showcase of fullstack engineering skills using Next.js, TypeScript, and modern web technologies",
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