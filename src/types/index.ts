export interface Skill {
  name: string
  level: number
  category: 'Frontend' | 'Backend' | 'Database' | 'DevOps' | 'Language' | 'API' | 'Tools'
}

export interface Project {
  id: number
  title: string
  description: string
  tech: string[]
  github: string
  live: string
  featured: boolean
  category: 'frontend' | 'backend' | 'fullstack' | 'mobile'
  image?: string
  createdAt?: string
  updatedAt?: string
}

export interface ContactForm {
  name: string
  email: string
  message: string
  subject?: string
}

export interface SocialLink {
  name: string
  url: string
  icon: React.ReactNode
  label: string
}

export interface Experience {
  id: number
  company: string
  position: string
  duration: string
  description: string[]
  technologies: string[]
  location: string
  type: 'full-time' | 'part-time' | 'contract' | 'internship'
}

export interface Education {
  id: number
  institution: string
  degree: string
  field: string
  duration: string
  gpa?: string
  achievements?: string[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}