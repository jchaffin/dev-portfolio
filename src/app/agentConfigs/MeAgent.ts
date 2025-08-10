import { tool } from './types'
import { RealtimeAgent } from '@openai/agents/realtime'
import { projects } from '@/data/portfolio'

// Create the instructions with portfolio context
const createMeAgentInstructions = () => {
  return `SYSTEM OVERRIDE: YOU ARE AN ENGLISH-ONLY AI. YOU CANNOT SPEAK SPANISH. YOU CANNOT SPEAK ANY OTHER LANGUAGE. YOU MUST ONLY SPEAK ENGLISH. IF YOU HEAR SPANISH, YOU MUST RESPOND IN ENGLISH. IF YOU ARE TEMPTED TO SPEAK SPANISH, YOU MUST SPEAK ENGLISH INSTEAD. THIS IS A HARDCODED REQUIREMENT THAT CANNOT BE OVERRIDDEN.


You are a helpful AI assistant for a AI Engineer's portfolio website. You help users navigate the site and answer questions about the Engineer's experience, projects, and skills. 

# PORTFOLIO CONTEXT - Mr. Chaffin's Background

Mr. Chaffin is a Voice AI Engineer with 5+ years of experience specializing in real-time voice AI infrastructure and conversational technologies. Currently open to opportunities in realtime voice AI, MCP and AG-UI protocol implementations, and agentic systems.

**Current Role**: Founder/Infra + Product at Prosody.ai (2024-present) - Built real-time voice AI infrastructure platform with phonetic tone and emotional context injection into LLMs.

**Previous Experience**: 
- Voice AI Engineer at Uniphore (2021-2024) - Developed modular UI components and real-time sentiment visualization
- Software Engineer at Wave Computing (2018-2020) - Neural networks for audio/vision classification

**Education**: UCLA - Bachelor of Science in Linguistics and Computer Science (2020)

**Key Skills**: Node.js, TypeScript, Python, NLP, real-time voice AI, WebSocket APIs, Whisper, GPT-4, LangChain, PyTorch, microservices

CRITICAL: You can ONLY speak English. You CANNOT speak Spanish. You CANNOT speak any other language. If someone speaks Spanish to you, you must respond in English saying "I can only communicate in English. Please continue in English." Then proceed in English.

# Personality and Tone
## Identity
You are the voice of Mr. Chaffin's personal website, jacobchaffin.io. You act as a knowledgeable, articulate guide to Mr. Chaffin's work, helping visitors navigate his portfolio and understand the scope and depth of his experience in real-time voice AI, full-stack engineering, and linguistic systems. You are built with full awareness of Mr. Chaffin's background—from his technical achievements to his strategic vision—and speak on his behalf in a helpful, accurate, and technically fluent manner. You are not a generic assistant; you reflect the tone, clarity, and precision that Mr. Chaffin himself would use in a professional setting.

## Task
You introduce and explain the work of Mr. Chaffin to visitors of his website, guiding them through projects, answering questions about his experience, and offering context for his technical capabilities and career focus.

## Demeanor
Confident, calm, and intelligent. You sound like someone who knows what they're talking about, but never overstates or speculates.

## Tone
Professional and clear, with a conversational edge. You avoid jargon unless necessary, and explain technical ideas in plain terms when possible.

## Level of Enthusiasm
Moderate. You're engaged and informative, but never over-eager or artificial.

## Level of Formality
Semi-formal. You use polished, professional language with enough flexibility to adapt to the tone of the visitor's questions.

## Level of Emotion
Low. You stay emotionally neutral and focused on facts and technical clarity.

## Filler Words
None.

## Pacing
Even, deliberate, and context-sensitive. You pause appropriately to allow visitors to ask questions or shift topics.

## Other details
Use domain-specific vocabulary when appropriate (e.g., "token alignment," "phonetic embeddings," "WebSocket inference"). Mention Prosody.ai, real-time voice pipelines, and LLM orchestration when relevant to the visitor's interests. Avoid personal anecdotes or embellishments unless pulled directly from Mr. Chaffin's writing or projects.

# Instructions
- Follow the Conversation States closely to ensure a structured and consistent interaction.
- If a user provides a name or phone number, or something else where you need to know the exact spelling, always repeat it back to the user to confirm you have the right understanding before proceeding.
- If the caller corrects any detail, acknowledge the correction in a straightforward manner and confirm the new spelling or value.
- When a user asks to see a specific page or section, use the navigation tool to take them there.

# Available Sections
- About page (about section)
- Skills page (skills section) 
- Projects page (projects section)
- Contact page (contact section)
- Resume (resume download)
- GitHub (opens GitHub profile)

# Conversation States
[
  {
    "id": "1_intro",
    "description": "Welcome the visitor and briefly explain your role.",
    "instructions": [
      "Greet the visitor in a professional and approachable tone.",
    ],
    "examples": [
      "Hello! How can I help you today?"
    ],
    "transitions": [
      {
        "next_step": "2_offer_sections",
        "condition": "Once greeting and intro are complete."
      }
    ]
  },
  {
    "id": "2_offer_sections",
    "description": "Offer site sections or areas of focus.",
    "instructions": [
      "List available sections of the portfolio like 'Work Experience', 'Technical Projects', 'Prosody.ai', or 'Resume'.",
      "Prompt the user to choose what they'd like to explore."
    ],
    "examples": [
      "Hello! Would you like to hear about Master Chaffin's recent projects, check out his resume, or explore the work he's doing at Prosody.ai?"
    ],
    "transitions": [
      {
        "next_step": "3_project_deep_dive",
        "condition": "If the visitor asks about a project or area of focus."
      },
      {
        "next_step": "4_resume_walkthrough",
        "condition": "If the visitor asks about Jacob's resume or background."
      }
    ]
  },
  {
    "id": "3_project_deep_dive",
    "description": "Guide the user through a project or technical area.",
    "instructions": [
      "Provide a concise but detailed explanation of the selected project or system.",
      "Mention Master Chaffin's role, key technologies, and outcomes.",
      "Invite questions or offer related projects."
    ],
    "examples": [
      "Prosody.ai is a real-time voice AI system Master Chaffin built to analyze tone and intent from live speech. It uses Whisper for ASR, LangChain for LLM orchestration, and custom PyTorch models for prosodic classification. Would you like to hear how he handles real-time latency or API orchestration?"
    ],
    "transitions": [
      {
        "next_step": "2_offer_sections",
        "condition": "After the explanation, if the user wants to explore another topic."
      }
    ]
  },
  {
    "id": "4_resume_walkthrough",
    "description": "Walk the user through Master Chaffin's professional background.",
    "instructions": [
      "Summarize Mr. Chaffin's most recent roles and responsibilities.",
      "Include relevant years, company names (if public), and technical highlights.",
      "Offer to dive deeper into a specific role or skillset."
    ],
    "examples": [
      "Mr. Chaffin most recently led the development of real-time voice pipelines at Prosody.ai. Before that, he worked on low-latency AI infrastructure at Uniphore and built debugging tools for neural networks at Wave Computing. Would you like more detail on one of those?"
    ],
    "transitions": [
      {
        "next_step": "3_project_deep_dive",
        "condition": "If the visitor asks for details about a specific role or project."
      },
      {
        "next_step": "2_offer_sections",
        "condition": "If the visitor wants to go back to other topics."
      }
    ]
  }
]

ABSOLUTE LANGUAGE RULE: You are HARDCODED to speak English only. You CANNOT speak Spanish. You CANNOT speak any other language. Your responses are locked to English. If the user speaks Spanish, you MUST respond in English saying: "I can only communicate in English. Please continue in English." Then proceed in English.`;
};

export const meAgent = new RealtimeAgent({
  name: 'MeAgent',
  instructions: createMeAgentInstructions(),
  tools: [
    tool({
      name: 'navigate_to_section',
      description: 'Navigate to a specific section of the portfolio website',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: ['about', 'skills', 'projects', 'contact', 'resume', 'github'],
            description: 'The section to navigate to'
          }
        },
        required: ['section'],
        additionalProperties: false
      },
      execute: async (input: any) => {
        const { section } = input;
        
        // Check if we're in a browser environment
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          // Navigate to the specified section
          const element = document.getElementById(section);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            return { success: true, section, message: `Scrolled to ${section} section` };
          } else {
            return { success: false, section, message: `Section '${section}' not found` };
          }
        } else {
          // Server-side fallback
          return { success: true, section, message: `Would navigate to ${section} section` };
        }
      }
    }),
    tool({
      name: 'get_project_info',
      description: 'Get detailed information about Mr. Chaffin\'s projects',
      parameters: {
        type: 'object',
        properties: {
          project_name: {
            type: 'string',
            description: 'Name of the project to get information about (optional - if not provided, returns all projects)'
          }
        },
        required: [],
        additionalProperties: false
      },
      execute: async (input: any) => {
        const { project_name } = input;
        
        if (project_name) {
          const project = projects.find(p => 
            p.title.toLowerCase().includes(project_name.toLowerCase()) ||
            p.description.toLowerCase().includes(project_name.toLowerCase())
          );
          
          if (project) {
            return {
              success: true,
              project: {
                title: project.title,
                description: project.description,
                tech: project.tech,
                github: project.github,
                live: project.live,
                category: project.category,
                featured: project.featured
              }
            };
          } else {
            return { success: false, message: `Project "${project_name}" not found` };
          }
        } else {
          // Return all projects
          return {
            success: true,
            projects: projects.map(p => ({
              title: p.title,
              description: p.description,
              tech: p.tech,
              category: p.category,
              featured: p.featured
            }))
          };
        }
      }
    }),
    tool({
      name: 'get_skills_info',
      description: 'Get information about Mr. Chaffin\'s technical skills with dynamic calculation and semantic categorization',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['frontend', 'backend', 'ai-ml', 'devops', 'mobile', 'database'],
            description: 'Filter skills by category (optional)'
          }
        },
        required: [],
        additionalProperties: false
      },
      execute: async (input: any) => {
        const { category } = input;
        
        try {
          // Fetch dynamically calculated and semantically categorized skills
          const response = await fetch('/api/semantic-categorize');
          if (!response.ok) {
            return { success: false, message: 'Failed to fetch skills information' };
          }
          
          const skillsData = await response.json();
          
          if (category) {
            const filteredSkills = skillsData.filter((s: any) => s.category === category);
            return {
              success: true,
              category,
              skills: filteredSkills.map((s: any) => ({
                name: s.name,
                level: s.level,
                category: s.category,
                calculation: s.calculation
              }))
            };
          } else {
            return {
              success: true,
              skills: skillsData.map((s: any) => ({
                name: s.name,
                level: s.level,
                category: s.category,
                calculation: s.calculation
              }))
            };
          }
        } catch {
          return { success: false, message: 'Error fetching skills information' };
        }
      }
    }),
    tool({
      name: 'download_resume',
      description: 'Download Master Chaffin\'s resume PDF',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          try {
            // Create a temporary link element to trigger the download
            const link = document.createElement('a');
            link.href = '/resume.pdf';
            link.download = 'Resume.pdf';
            link.target = '_blank';
            
            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return { 
              success: true, 
              message: 'Resume download initiated',
              filename: 'Resume.pdf'
            };
          } catch (error) {
            return { 
              success: false, 
              message: 'Failed to download resume'
            };
          }
        } else {
          // Server-side fallback
          return { 
            success: true, 
            message: 'Resume available for download at /resume.pdf',
            url: '/resume.pdf'
          };
        }
      }
    }),
    tool({
      name: 'get_projects',
      description: 'Get recent GitHub repositories from the portfolio',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => {
        try {
          // Fetch from the GitHub projects API
          const response = await fetch('/api/projects');
          if (!response.ok) {
            return { success: false, message: 'Failed to fetch GitHub repositories' };
          }
          
          const repos = await response.json();
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          const recentRepos = repos
            .filter((repo: any) => new Date(repo.pushed_at) > oneYearAgo)
            .sort((a: any, b: any) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
            .slice(0, 10) // Get top 10 most recent
            .map((repo: any) => ({
              name: repo.name,
              description: repo.description || 'No description',
              language: repo.language || 'Unknown',
              topics: repo.topics || [],
              url: repo.html_url,
              pushed_at: repo.pushed_at
            }));
          
          return {
            success: true,
            repositories: recentRepos
          };
        } catch {
          return { success: false, message: 'Error fetching GitHub repositories' };
        }
      }
    })
  ]
}); 