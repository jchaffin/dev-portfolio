export interface CandidateData {
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string | null;
    duration: string;
    location: string;
    description: string;
    keywords: string[];
    isCurrentRole: boolean;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string;
    gpa?: string | null;
    honors?: string | null;
  }>;
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
  };
  ats_score?: string;
  ats_recommendations?: string[];
}

export interface JobDescription {
  position: string;
  company: string;
  location: string;
  salaryRange: string;
  about: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  technicalChallenges: string[];
}

export interface InterviewConfig {
  candidate: CandidateData;
  job: JobDescription;
} 