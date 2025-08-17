import { tool } from './types'
import { RealtimeAgent } from '@openai/agents/realtime'
import { skills } from '@/data/portfolio'
import resumeData from '@/data/resume.json'
// gh-rag is server-side only due to Node.js dependencies

// Debug: Check if skills are loaded
console.log('🔧 MeAgent - Skills loaded:', skills.length);
console.log('🔧 MeAgent - Skills:', skills.map(s => s.name));

// Create the instructions with portfolio context
const createMeAgentInstructions = () => {
  return `SYSTEM OVERRIDE: YOU ARE AN ENGLISH-ONLY AI. YOU CANNOT SPEAK SPANISH. YOU CANNOT SPEAK ANY OTHER LANGUAGE. YOU MUST ONLY SPEAK ENGLISH. IF YOU HEAR SPANISH, YOU MUST RESPOND IN ENGLISH. IF YOU ARE TEMPTED TO SPEAK SPANISH, YOU MUST SPEAK ENGLISH INSTEAD. THIS IS A HARDCODED REQUIREMENT THAT CANNOT BE OVERRIDDEN.


You are a helpful AI assistant for ${resumeData.name}'s portfolio website. You help users navigate the site and answer questions about their experience, projects, and skills. 

IMPORTANT: When users ask about projects, technical work, or want to see examples of work, you MUST use the get_projects tool to retrieve current project details. Do not rely only on the context - always call the tool for the most up-to-date project information. 

# PORTFOLIO CONTEXT - ${resumeData.name}

${resumeData.summary}

**Current Role**: ${resumeData.experience[0]?.role} at ${resumeData.experience[0]?.company} (${resumeData.experience[0]?.duration})
${resumeData.experience[0]?.description}

**Education**: ${resumeData.education.map(edu => `${edu.institution} - ${edu.degree} (${edu.year})`).join(', ')}

**Key Skills**: ${resumeData.skills.slice(0, 10).join(', ')}

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
- When users ask about projects, technical work, or want to see all projects, ALWAYS use the get_projects tool FIRST to load project data and pre-cache RAG information.
- When users ask about specific project details or code examples, use search_github_repo to find relevant code snippets.
- When users ask about skills or technical expertise, use the get_skills_info tool to provide accurate information.
- Use the download_resume tool when users request resume information or want to download it.
- When users want to contact Jacob or send an email, IMMEDIATELY use the send_email tool to open a contact form. Do not ask for details first - just open the form.
- When users want to schedule a meeting or call, IMMEDIATELY use the set_meeting tool to provide a Calendly link. Do not ask for meeting type first - just open the scheduler.
- When users ask about code implementation, technical details, or want to explore repository contents, use the search_github_repo tool to find relevant code snippets (get_projects should be called first to ensure RAG data is loaded).

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
      "Hello! How can I help you today? I am ${resumeData.name}'s voice Agent. Feel free to ask me about ${resumeData.name.split(' ')[0]}'s work, skills, or anything else you'd like to know."
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
      "Welcome! I can tell you about ${resumeData.name}'s latest work in ${resumeData.experience[0]?.role} at ${resumeData.experience[0]?.company}, show you their technical projects, or help you get in touch. What interests you most?"
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
      "Let me tell you about ${resumeData.experience[0]?.company} - ${resumeData.experience[0]?.description.split('.')[0]}. This project showcases expertise in ${resumeData.skills.slice(0, 3).join(', ')} and more. Would you like to dive deeper into the technical implementation or see other projects?"
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
      "${resumeData.name} has ${resumeData.experience.length}+ years of experience across ${resumeData.experience.map(exp => exp.company).slice(0, 3).join(', ')}. Currently working as ${resumeData.experience[0]?.role} at ${resumeData.experience[0]?.company}. Would you like to hear about a specific role or see their technical skills?"
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
        
        console.log('🔧 get_skills_info called with:', { category });
        console.log('🔧 Available skills from portfolio:', skills.length);
        
        try {
          // Pass skills to semantic categorization API
          const response = await fetch('/api/semantic-categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skills: skills })
          });
          
          if (!response.ok) {
            console.log('🔧 Semantic categorize API failed, falling back to raw skills');
            // Fallback to raw skills if API fails
            const rawSkills = skills.map(s => ({
              name: s.name,
              level: s.level,
              category: 'uncategorized',
              calculation: `Based on portfolio analysis: ${s.level}%`
            }));
            
            if (category) {
              return {
                success: true,
                category,
                skills: rawSkills, // Return all since we don't have categories
                note: 'Using raw skills data - semantic categorization unavailable'
              };
            } else {
              return {
                success: true,
                skills: rawSkills,
                note: 'Using raw skills data - semantic categorization unavailable'
              };
            }
          }
          
          const responseData = await response.json();
          const skillsData = responseData.categorizedSkills || responseData;
          console.log('🔧 Semantically categorized skills received:', skillsData.length);
          
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
        } catch (error) {
          console.error('🔧 Error in get_skills_info:', error);
          return { success: false, message: 'Error fetching skills information' };
        }
      }
    }),
    tool({
      name: 'send_email',
      description: 'Create a contact form for the user to send an email to Jacob Chaffin. Use this when users want to contact, email, reach out to, or get in touch with Jacob.',
      parameters: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            description: 'Subject line for the email (optional)'
          },
          context: {
            type: 'string',
            description: 'Context about what the user wants to discuss (optional)'
          }
        },
        required: [],
        additionalProperties: false
      },
      execute: async (input: any) => {
        const { subject, context } = input;
        
        console.log('🔧 send_email called with:', { subject, context });
        
        try {
          // Trigger UI action to show contact form
          const result = {
            success: true,
            action: 'show_contact_form',
            message: 'I\'ll open a contact form for you to send an email to Jacob.',
            form_data: {
              subject: subject || '',
              context: context || '',
              prefilled: true
            }
          };
          
          // Dispatch custom event for UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agent-tool-response', {
              detail: { type: 'agent_tool_end', name: 'send_email', output: result }
            }));
          }
          
          return result;
        } catch (error) {
          console.error('🔧 Error in send_email:', error);
          return { 
            success: false, 
            message: 'Error opening contact form' 
          };
        }
      }
    }),
    tool({
      name: 'set_meeting',
      description: 'Create a Calendly link for the user to schedule a meeting with Jacob Chaffin',
      parameters: {
        type: 'object',
        properties: {
          meeting_type: {
            type: 'string',
            enum: ['intro', 'technical', 'consulting', 'general'],
            description: 'Type of meeting to schedule'
          },
          duration: {
            type: 'string',
            enum: ['15min', '30min', '60min'],
            description: 'Preferred meeting duration'
          }
        },
        required: [],
        additionalProperties: false
      },
      execute: async (input: any) => {
        const { meeting_type, duration } = input;
        
        console.log('🔧 set_meeting called with:', { meeting_type, duration });
        
        try {
          // Generate appropriate Calendly link based on meeting type
          let calendlyUrl = 'https://calendly.com/jacobchaffin'; // Replace with actual Calendly URL
          
          // Customize URL based on meeting type and duration
          switch (meeting_type) {
            case 'intro':
              calendlyUrl = 'https://calendly.com/jacobchaffin/intro-call';
              break;
            case 'technical':
              calendlyUrl = 'https://calendly.com/jacobchaffin/technical-discussion';
              break;
            case 'consulting':
              calendlyUrl = 'https://calendly.com/jacobchaffin/consulting-session';
              break;
            default:
              calendlyUrl = 'https://calendly.com/jacobchaffin/general-meeting';
          }
          
          // Add duration parameter if supported
          if (duration) {
            calendlyUrl += `?duration=${duration}`;
          }
          
          const result = {
            success: true,
            action: 'open_calendly',
            message: `I'll open a Calendly link for you to schedule a ${meeting_type || 'general'} meeting with Jacob.`,
            calendly_url: calendlyUrl,
            meeting_details: {
              type: meeting_type || 'general',
              duration: duration || '30min'
            }
          };
          
          // Dispatch custom event for UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agent-tool-response', {
              detail: { type: 'agent_tool_end', name: 'set_meeting', output: result }
            }));
          }
          
          return result;
        } catch (error) {
          console.error('🔧 Error in set_meeting:', error);
          return { 
            success: false, 
            message: 'Error creating meeting link' 
          };
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
      description: 'Get recent projects from the portfolio and pre-load RAG data for follow-up questions',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => {
        console.log('🔧 get_projects called');
        
        try {
          // Use the local API route instead of calling GitHub directly
          const apiRes = await fetch('/api/projects');
          
          if (!apiRes.ok) {
            console.log('🔧 API request failed, falling back to local portfolio data');
            // No local projects fallback - use API only
            return {
              success: false,
              projects: [],
              message: 'Projects API unavailable and no fallback data.'
            };
          }

          const githubRepos = await apiRes.json();
          
          // Pre-load RAG data in background for common project queries
          const ragQueries = [
            'authentication system',
            'database models', 
            'API endpoints',
            'React components',
            'project architecture'
          ];
          
          // Get repo names from GitHub API response
          const repoNames = githubRepos
            .filter((repo: any) => !repo.fork && repo.name)
            .map((repo: any) => repo.name)
            .filter(Boolean);
          
          const repoName = repoNames[0] || 'devfolio'; // Use first available repo or default
          
          // Fire off RAG requests in background with correct repo (don't await)
          ragQueries.forEach(query => {
            fetch('/api/rag', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ repo: repoName, query, limit: 3 })
            }).catch(() => {}); // Silent fail for background preloading
          });
          
          console.log('🔧 Projects fetched from API, RAG preloading started');
          
          // Transform GitHub repos to match Project format
          const transformedProjects = githubRepos.map((repo: any) => ({
            id: repo.id || repo.name,
            title: repo.name,
            description: repo.description || '',
            tech: Array.isArray(repo.topics) ? repo.topics : [],
            github: repo.html_url,
            live: repo.vercel_deployment?.url || repo.homepage || '',
            category: 'development',
            featured: repo.stargazers_count > 5
          }));

          return {
            success: true,
            projects: transformedProjects,
            message: `Found ${transformedProjects.length} projects. RAG data preloaded for technical questions.`
          };
        } catch (error) {
          console.error('🔧 Error in get_projects:', error);
          // No local fallback - API required
          return {
            success: false,
            projects: [],
            message: 'Error fetching projects from API'
          };
        }
      }
    }),
    tool({
      name: 'search_github_repo',
      description: 'Search through GitHub repositories using RAG to find relevant code snippets and documentation. Use this when users ask about technical implementation details, code examples, or want to explore repository contents.',
      parameters: {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            description: 'Repository name to search in (e.g., "prosody-ai", "devfolio")'
          },
          query: {
            type: 'string',
            description: 'Search query describing what to look for (e.g., "authentication flow", "API endpoints", "React components")'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of code snippets to return (default: 5)',
            default: 5
          }
        },
        required: ['repo', 'query'],
        additionalProperties: false
      },
      execute: async (input: any) => {
        const { repo, query, limit = 5 } = input;
        
        try {
          console.log('🔧 search_github_repo called with:', { repo, query, limit });
          
          // Try RAG API first
          try {
            const response = await fetch('/api/rag', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ repo, query, limit })
            });
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.success && data.snippetsFound > 0) {
                console.log('🔧 Found snippets via RAG:', data.snippetsFound);
                return {
                  success: true,
                  repo: data.repo,
                  query: data.query,
                  snippetsFound: data.snippetsFound,
                  snippets: data.snippets,
                  message: `Found ${data.snippetsFound} relevant code snippet${data.snippetsFound === 1 ? '' : 's'} in ${data.repo} for "${query}"`
                };
              }
            }
          } catch (ragError) {
            console.log('🔧 RAG API failed, falling back to mock data:', ragError);
          }
          
          // Fallback: provide general project information
          console.log('🔧 Using fallback behavior for query:', query);
          
          const fallbackSnippets = [
            {
              file: 'src/components/VoiceAISection.tsx',
              content: 'Real-time voice AI implementation with WebRTC and audio processing',
              score: 0.9
            },
            {
              file: 'src/hooks/useRealtimeSession.ts', 
              content: 'Session management for real-time voice interactions',
              score: 0.85
            },
            {
              file: 'src/app/agentConfigs/MeAgent.ts',
              content: 'AI agent configuration with tools for portfolio interaction',
              score: 0.8
            }
          ];
          
          // Filter snippets based on query keywords
          const queryLower = query.toLowerCase();
          const relevantSnippets = fallbackSnippets.filter(snippet => 
            snippet.content.toLowerCase().includes(queryLower) ||
            snippet.file.toLowerCase().includes(queryLower) ||
            queryLower.includes('voice') || queryLower.includes('ai') || 
            queryLower.includes('react') || queryLower.includes('component')
          ).slice(0, limit);
          
          return {
            success: true,
            repo: repo || 'devfolio',
            query,
            snippetsFound: relevantSnippets.length,
            snippets: relevantSnippets,
            message: `Found ${relevantSnippets.length} general code reference${relevantSnippets.length === 1 ? '' : 's'} for "${query}" (RAG service unavailable)`
          };
          
        } catch (error) {
          console.error('🔧 Error in search_github_repo:', error);
          return { 
            success: false, 
            message: `Error searching repository "${repo}": ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      }
    })
  ]
}); 