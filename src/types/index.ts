export * from './realtime'

export interface Skill {
  name: string
  level: number
  category: string
  calculation?: {
    frequency: number
    maxFrequency: number
    sources: string[]
    breakdown: {
      projects: number
      experience: number
      resumeSkills: number
    }
  }
  subSkills?: string[]
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

// Voice AI Types
export interface PortfolioContext {
  experiences: Experience[];
  projects: Project[];
  skills: Skill[];
  summary: string;
  resume: {
    workExperience: Experience[];
    technicalSkills: Skill[];
    projects: Project[];
    summary: string;
  };
  completeResume: {
    summary: string;
    skills: Skill[];
    experience: Experience[];
    education: Education[];
    contact: any;
  };
}

export interface VoiceAIState {
  sessionStatus: "DISCONNECTED" | "CONNECTING" | "CONNECTED";
  userText: string;
  microphoneStream: MediaStream | null;
  isAudioPlaybackEnabled: boolean;
}

export interface VoiceAIActions {
  connectToRealtime: () => Promise<void>;
  disconnectFromRealtime: () => Promise<void>;
  handleSendTextMessage: () => void;
  setUserText: (text: string) => void;
  toggleAudioPlayback: () => void;
}

export interface MessageItem {
  itemId: string;
  type: "MESSAGE" | "BREADCRUMB";
  role: "user" | "assistant";
  title: string;
  timestamp: string;
  isHidden: boolean;
  createdAtMs: number;
}

