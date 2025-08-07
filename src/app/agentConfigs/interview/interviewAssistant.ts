import { tool } from '@openai/agents/realtime';

// Resume data for contextual interview suggestions
const candidateResume = {
  summary: "Dynamic AI Engineer with over 5 years of experience in crafting innovative web applications and AI solutions that drive user engagement and operational efficiency. Expertise lies in developing scalable platforms utilizing Node.js, React, and advanced machine learning techniques, particularly in natural language processing. Proven ability to integrate real-time data streams and enhance user interfaces for enterprise-level applications. Committed to leveraging technical acumen and collaborative skills to deliver impactful results in the field of voice AI and customer experience.",
  skills: ["Node.js", "Typescript", "Python", "NLP", "Data Science", "GraphQL", "Rust", "Conversational AI"],
  experience: [
    {
      company: "Prosody.ai",
      role: "Founder / Infra + Product",
      duration: "2024 Present",
      description: "Built a real-time voice AI infrastructure platform that injects phonetic tone and emotional context into LLMs via a multimodal pipeline. Designed and deployed latency-optimized microservices for acoustic feature extraction, tone modeling, and token conditioning. Integrated WebSocket + REST APIs with Whisper, GPT-4, and LangChain agents for live sentiment augmentation. Created SDK and open API spec; deployed dashboard in Next.js + WebRTC with real-time charts using Recharts. Led full-stack architecture including Dockerized backend, CI/CD workflows, LLM fine-tuning, and synthetic data generation.",
      keywords: ["real-time voice AI", "microservices", "WebSocket", "REST APIs", "Whisper", "GPT-4", "LangChain", "SDK"],
      isCurrentRole: true
    },
    {
      company: "Uniphore",
      role: "Voice AI Engineer",
      duration: "September 2021 October 2024",
      description: "Developed modular UI components and dynamic pages for agent-assist tools using Next.js, React, and GraphQL, integrating live ASR and voice analytics. Engineered real-time sentiment visualization layers with phonetic and lexical embeddings for enhanced client-side rendering. Streamlined SSR/ISR logic for data-heavy voice sessions, improving initial load times by 35%. Modernized analytics pipelines to support LLM-driven conversational interfaces, implementing deep tone-aware inference. Built internal analytics tools with NumPy, Pandas, Jupyter, and Python for behavioral insights.",
      keywords: ["Next.js", "React", "GraphQL", "ASR", "voice analytics", "phonetic embeddings", "SSR/ISR", "behavioral insights"],
      isCurrentRole: false
    },
    {
      company: "Wave Computing",
      role: "Software Engineer",
      duration: "June 2018 September 2020",
      description: "Developed and optimized neural networks for audio and vision classification using PyTorch. Built and deployed machine learning models utilizing TensorFlow, enhancing model accuracy through extensive data analysis. Created full-stack applications for administrative login and data transfer with Node.js and React, integrating GraphQL for efficient data querying. Designed and maintained an interactive visualization tool for error tracing on Wave's proprietary DPU-based compiler. Collaborated with cross-functional teams to integrate AI solutions into products, researching cutting-edge techniques in natural language processing.",
      keywords: ["PyTorch", "TensorFlow", "Node.js", "React", "GraphQL", "DPU-based compiler", "error tracing"],
      isCurrentRole: false
    }
  ],
  education: [
    {
      institution: "University of California, Los Angeles",
      degree: "Bachelor of Science",
      field: "Linguistics and Computer Science",
      year: "2020"
    }
  ]
};

// Tool for providing interview suggestions based on conversation context and resume data
export const getInterviewSuggestion = tool({
  name: 'getInterviewSuggestion',
  description: 'Get contextual interview suggestions based on the current conversation, interview context, and candidate resume',
  parameters: {
    type: 'object',
    properties: {
      context: {
        type: 'string',
        description: 'The current interview context, including the last question asked and any relevant conversation details'
      },
      candidateResponse: {
        type: 'string',
        description: 'The candidate\'s response if they have started answering'
      },
      interviewType: {
        type: 'string',
        enum: ['behavioral', 'technical', 'case_study', 'general', 'leadership', 'culture_fit'],
        description: 'The type of interview being conducted'
      },
      suggestionType: {
        type: 'string',
        enum: ['structure', 'confidence', 'clarification', 'example', 'follow_up', 'body_language', 'enhancement', 'technical', 'salary', 'closing', 'resume_specific'],
        description: 'The type of suggestion needed'
      }
    },
    required: ['context'],
    additionalProperties: false
  },
  execute: async (input: any) => {
    const { context, candidateResponse, interviewType, suggestionType } = input as {
      context: string;
      candidateResponse?: string;
      interviewType?: 'behavioral' | 'technical' | 'case_study' | 'general' | 'leadership' | 'culture_fit';
      suggestionType?: 'structure' | 'confidence' | 'clarification' | 'example' | 'follow_up' | 'body_language' | 'enhancement' | 'technical' | 'salary' | 'closing' | 'resume_specific';
    };
    // Analyze the context and provide appropriate suggestions
    let suggestion = '';
    let urgency = 'normal';
    
    // Determine interview type from context if not provided
    let determinedInterviewType = interviewType;
    if (!determinedInterviewType) {
      if (context.toLowerCase().includes('code') || context.toLowerCase().includes('algorithm') || context.toLowerCase().includes('technical')) {
        determinedInterviewType = 'technical';
      } else if (context.toLowerCase().includes('time') || context.toLowerCase().includes('situation') || context.toLowerCase().includes('challenge')) {
        determinedInterviewType = 'behavioral';
      } else if (context.toLowerCase().includes('case') || context.toLowerCase().includes('scenario')) {
        determinedInterviewType = 'case_study';
      } else if (context.toLowerCase().includes('lead') || context.toLowerCase().includes('manage') || context.toLowerCase().includes('team')) {
        determinedInterviewType = 'leadership';
      } else {
        determinedInterviewType = 'general';
      }
    }
    
    if (suggestionType === 'structure') {
      suggestion = 'Try using the STAR method: Situation, Task, Action, Result. Start with the specific situation, then describe your task, the actions you took, and the results achieved.';
    } else if (suggestionType === 'confidence') {
      suggestion = 'Take a deep breath and speak more slowly. Remember to maintain good posture and make eye contact. You\'ve got this!';
      urgency = 'high';
    } else if (suggestionType === 'clarification') {
      suggestion = 'Ask them to clarify what they mean by that question. It\'s perfectly fine to ask for more specific details to give a better answer.';
    } else if (suggestionType === 'example') {
      suggestion = 'Provide a specific example from your previous experience. Use concrete details and measurable outcomes when possible.';
    } else if (suggestionType === 'follow_up') {
      suggestion = 'Ask a follow-up question to show your interest. For example, ask about the team size, project scope, or company culture.';
    } else if (suggestionType === 'body_language') {
      suggestion = 'Maintain eye contact, sit up straight, and use open body language. Remember to nod occasionally to show you\'re listening.';
    } else if (suggestionType === 'enhancement') {
      suggestion = 'Mention the impact of your actions, not just what you did. Focus on results and outcomes that demonstrate your value.';
    } else if (suggestionType === 'technical') {
      suggestion = 'Think out loud as you solve this. Break down the problem into smaller steps and explain your reasoning process.';
    } else if (suggestionType === 'salary') {
      suggestion = 'Research the market rate for this role and give a specific range. Be prepared to justify your expectations with your experience and skills.';
    } else if (suggestionType === 'closing') {
      suggestion = 'Ask thoughtful questions about the role, team, and company. Show genuine interest in the opportunity.';
    } else if (suggestionType === 'resume_specific') {
      // Provide resume-specific suggestions based on the candidate's background
      if (context.toLowerCase().includes('leadership') || context.toLowerCase().includes('founder') || context.toLowerCase().includes('startup')) {
        suggestion = 'Highlight your experience as founder of Prosody.ai. Mention how you built the real-time voice AI infrastructure from scratch and led the full-stack architecture.';
      } else if (context.toLowerCase().includes('technical') || context.toLowerCase().includes('coding') || context.toLowerCase().includes('programming')) {
        suggestion = 'Mention your expertise in Node.js, React, Python, and NLP. You can discuss your work with Whisper, GPT-4, and LangChain at Prosody.ai.';
      } else if (context.toLowerCase().includes('team') || context.toLowerCase().includes('collaboration')) {
        suggestion = 'Discuss your experience at Uniphore where you collaborated with cross-functional teams and improved initial load times by 35%.';
      } else if (context.toLowerCase().includes('challenge') || context.toLowerCase().includes('difficult')) {
        suggestion = 'You could mention the challenge of building real-time voice AI infrastructure at Prosody.ai, or optimizing neural networks at Wave Computing.';
      } else if (context.toLowerCase().includes('innovation') || context.toLowerCase().includes('creative')) {
        suggestion = 'Highlight your work on phonetic tone and emotional context injection into LLMs, or your real-time sentiment visualization layers.';
      } else if (context.toLowerCase().includes('metrics') || context.toLowerCase().includes('results')) {
        suggestion = 'Mention the 35% improvement in initial load times at Uniphore, or the successful deployment of microservices for acoustic feature extraction.';
      } else if (context.toLowerCase().includes('ai') || context.toLowerCase().includes('machine learning')) {
        suggestion = 'Focus on your AI/ML experience: PyTorch, TensorFlow, NLP, and your work with voice AI and conversational AI systems.';
      } else if (context.toLowerCase().includes('full-stack') || context.toLowerCase().includes('frontend') || context.toLowerCase().includes('backend')) {
        suggestion = 'Highlight your full-stack experience with Next.js, React, Node.js, GraphQL, and your work on real-time applications.';
      } else {
        suggestion = 'Draw from your experience at Prosody.ai (founder), Uniphore (voice AI engineer), or Wave Computing (software engineer) depending on the question.';
      }
    } else {
      // Default contextual suggestion based on the conversation and interview type
      if (determinedInterviewType === 'technical') {
        if (context.toLowerCase().includes('algorithm') || context.toLowerCase().includes('complexity')) {
          suggestion = 'Start by explaining your approach, then discuss time and space complexity. Consider edge cases.';
        } else if (context.toLowerCase().includes('design') || context.toLowerCase().includes('architecture')) {
          suggestion = 'Begin with requirements, then discuss trade-offs. Consider scalability, maintainability, and performance.';
        } else if (context.toLowerCase().includes('ai') || context.toLowerCase().includes('ml')) {
          suggestion = 'Draw from your experience with PyTorch, TensorFlow, and NLP. Mention your work on voice AI and neural networks.';
        } else {
          suggestion = 'Think out loud as you solve this. Break down the problem and explain your reasoning step by step.';
        }
      } else if (determinedInterviewType === 'behavioral') {
        if (context.toLowerCase().includes('challenge') || context.toLowerCase().includes('difficult')) {
          suggestion = 'Focus on how you overcame the challenge and what you learned from it. Be specific about the steps you took.';
        } else if (context.toLowerCase().includes('team') || context.toLowerCase().includes('collaboration')) {
          suggestion = 'Emphasize your role in the team and how you contributed to the group\'s success. Mention any leadership moments.';
        } else if (context.toLowerCase().includes('failure') || context.toLowerCase().includes('mistake')) {
          suggestion = 'Be honest about what happened, but focus on what you learned and how you grew from the experience.';
        } else if (context.toLowerCase().includes('leadership')) {
          suggestion = 'Highlight your experience as founder of Prosody.ai and how you led the full-stack architecture and team.';
        } else {
          suggestion = 'Use the STAR method: Situation, Task, Action, Result. Be specific and provide measurable outcomes.';
        }
      } else if (determinedInterviewType === 'case_study') {
        suggestion = 'Start by clarifying the problem, then structure your approach. Consider multiple perspectives and potential solutions.';
      } else if (determinedInterviewType === 'leadership') {
        suggestion = 'Focus on your leadership style, how you motivate others, and specific examples of leading teams or projects.';
      } else {
        // General interview
        if (context.toLowerCase().includes('salary') || context.toLowerCase().includes('compensation')) {
          suggestion = 'Research the market rate for this role and give a specific range. Be prepared to justify your expectations.';
        } else if (context.toLowerCase().includes('why') && context.toLowerCase().includes('company')) {
          suggestion = 'Show you\'ve done your research. Mention specific aspects of the company that align with your values and goals.';
        } else if (context.toLowerCase().includes('strengths') || context.toLowerCase().includes('weaknesses')) {
          suggestion = 'For strengths, be specific with examples. For weaknesses, focus on what you\'re doing to improve.';
        } else if (context.toLowerCase().includes('experience') || context.toLowerCase().includes('background')) {
          suggestion = 'Highlight your 5+ years of experience in AI engineering, your work at Prosody.ai, Uniphore, and Wave Computing.';
        } else {
          suggestion = 'Take a moment to think before responding. Be specific and provide concrete examples from your experience.';
        }
      }
    }

    // Add urgency indicator for high-priority suggestions
    const urgencyIndicator = urgency === 'high' ? ' (URGENT)' : '';

    // Add resume context for relevant suggestions
    let resumeContext = '';
    if (suggestionType === 'resume_specific' || context.toLowerCase().includes('experience') || context.toLowerCase().includes('background')) {
      resumeContext = 'Resume highlights: AI Engineer with 5+ years experience, Founder at Prosody.ai, Voice AI Engineer at Uniphore, expertise in Node.js, React, Python, NLP, and voice AI systems.';
    }

    return {
      suggestion: suggestion + urgencyIndicator,
      context: `Based on the interview context: "${context}"`,
      interviewType: determinedInterviewType,
      resumeContext,
      tip: 'Remember to be authentic and honest in your responses while highlighting your strengths and experiences from your resume.',
      urgency
    };
  },
}); 