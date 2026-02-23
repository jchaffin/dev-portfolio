import { ReactNode } from 'react';

export interface Suggestion {
  id: string;
  label: string;
  message: string;
}

export interface ProjectSuggestion {
  id: string;
  name: string;
  description?: string;
  url?: string;
  github?: string;
}

export interface ExperienceSuggestion {
  id: string;
  company: string;
  role: string;
  duration?: string;
  location?: string;
  description?: string;
}

export interface SkillSuggestion {
  id: string;
  name: string;
  category?: string;
  proficiency?: string;
}

export interface SectionSuggestion {
  id: string;
  label: string;
  description?: string;
}

export interface AgentSuggestions {
  type: 'action' | 'project' | 'experience' | 'skill' | 'section';
  suggestions: Suggestion[];
  projects?: ProjectSuggestion[];
  experiences?: ExperienceSuggestion[];
  skills?: SkillSuggestion[];
  sections?: SectionSuggestion[];
  prompt?: string;
}

export interface TranscriptItem {
  itemId: string;
  type: string;
  role?: string;
  title?: string;
  timestamp?: string;
  createdAtMs: number;
  isHidden?: boolean;
}

export interface FormSubmissionState {
  name: string;
  email: string;
  subject: string;
  message: string;
  isSubmitting: boolean;
  submitStatus: 'idle' | 'success' | 'error';
}

export interface ContactFormData {
  subject?: string;
  context?: string;
}

export interface CalendlyData {
  url: string;
  details?: {
    type: string;
    duration: string;
  };
}
