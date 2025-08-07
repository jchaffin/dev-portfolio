import { InterviewConfig } from './types';
import sampleResume from '../chatSupervisor/sample-resume.json';

export const interviewConfig: InterviewConfig = {
  candidate: sampleResume,
  job: {
    position: "Senior AI Engineer",
    company: "TechCorp",
    location: "San Francisco, CA (hybrid)",
    salaryRange: "$180,000 - $250,000 + equity",
    about: "TechCorp is a rapidly growing AI company focused on building next-generation voice AI infrastructure. We're developing real-time conversational AI systems that power millions of interactions daily. Our platform processes voice data in real-time, providing instant sentiment analysis, emotion detection, and intelligent responses.",
    description: "We're seeking a Senior AI Engineer to join our core AI infrastructure team. You'll be responsible for designing, building, and optimizing our real-time voice AI systems that process thousands of concurrent audio streams. This role requires deep expertise in AI/ML, real-time systems, and production-scale deployment.",
    requirements: [
      "5+ years of experience in AI/ML engineering with focus on real-time systems",
      "Strong background in voice AI, speech recognition, and natural language processing",
      "Expertise in Python, Node.js, React, and modern AI frameworks",
      "Experience with Whisper, GPT-4, LangChain, PyTorch, TensorFlow",
      "Knowledge of microservices architecture, Docker, and cloud deployment (AWS/GCP)",
      "Experience with WebSocket, REST APIs, and real-time data processing",
      "Strong problem-solving skills and ability to debug complex distributed systems",
      "Experience leading technical projects and mentoring junior engineers",
      "Bachelor's degree in Computer Science, AI, or related field"
    ],
    responsibilities: [
      "Design and implement real-time AI systems for voice processing",
      "Build scalable voice AI infrastructure that handles high-throughput audio streams",
      "Optimize performance and reduce latency in production AI systems",
      "Lead technical architecture decisions for AI infrastructure",
      "Mentor junior engineers and contribute to technical strategy",
      "Collaborate with cross-functional teams on AI product development",
      "Implement and optimize machine learning models for real-time inference",
      "Design and maintain APIs for AI service integration",
      "Monitor and improve system reliability and performance",
      "Contribute to research and development of new AI capabilities"
    ],
    technicalChallenges: [
      "Processing real-time audio streams with sub-100ms latency",
      "Scaling AI inference across distributed systems",
      "Optimizing model performance for edge deployment",
      "Building robust error handling and fallback mechanisms",
      "Integrating multiple AI models into cohesive systems"
    ]
  }
}; 