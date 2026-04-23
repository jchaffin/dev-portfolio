'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

// Data imports
import { experiences, skills as portfolioSkills } from '@/data/portfolio';
import { getProjects, type Project } from '@/lib/getProjects';
import { getDynamicSkills } from '@/lib/skills';
import resumeData from '@/data/resume.json';
import type { Skill } from '@/types';

// Types & Constants
import type { PortfolioContext } from '@/types';
import { VOICE_AI_CONSTANTS } from '@/lib/constants';

// Context providers from voicekit
import { EventProvider, TranscriptProvider, SuggestionProvider } from '@jchaffin/voicekit';

// Voice components
import {
  SuggestionChips,
  DEFAULT_SUGGESTIONS,
  ContextPills,
  PlayButton,
  VoiceTranscript,
  ChatInput,
  InlineContactForm,
  VoiceFeatureGrid,
  AnimatedBackground,
} from './voice';

// Other components
import CalendlyModal from './CalendlyModal';

// Hook
import { useVoiceAgent } from '@/hooks/useVoiceAgent';

// Main section wrapper with providers
const VoiceAISection = () => {
  return (
    <EventProvider>
      <TranscriptProvider>
        <SuggestionProvider>
          <VoiceAIContent />
        </SuggestionProvider>
      </TranscriptProvider>
    </EventProvider>
  );
};

// Main content component
const VoiceAIContent = () => {
  // Dynamic projects state
  const [projects, setProjects] = useState<Project[]>([]);
  // Categorized skills state
  const [skills, setSkills] = useState<Skill[]>(portfolioSkills);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      let githubProjects: Project[] = [];
      try {
        githubProjects = await getProjects();
      } catch {
        // Keep projects empty on error
      }
      if (cancelled) return;
      setProjects(githubProjects);

      try {
        const initialSkills = getDynamicSkills(portfolioSkills, githubProjects);
        const response = await fetch('/api/skills/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills: initialSkills }),
        });
        if (!cancelled && response.ok) {
          const { categorizedSkills } = await response.json();
          setSkills(categorizedSkills);
        }
      } catch {
        // Keep using portfolioSkills on error
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, []);

  // Portfolio data for context (uses categorized skills from state)
  const portfolioContext: PortfolioContext = {
    experiences: experiences as any,
    projects: projects as any,
    skills: skills.slice(0, VOICE_AI_CONSTANTS.TOP_SKILLS_COUNT) as any,
    summary: resumeData.summary,
    resume: {
      workExperience: experiences as any,
      technicalSkills: skills as any,
      projects: projects as any,
      summary: resumeData.summary,
    },
    completeResume: {
      summary: resumeData.summary,
      skills: resumeData.skills as any,
      experience: resumeData.experience as any,
      education: resumeData.education as any,
      contact: resumeData.contact,
    },
  };

  // Voice agent hook
  const {
    sessionStatus,
    transcriptItems,
    toggleConnection,
    sendMessage,
    resetChat,
    contactFormOpen,
    setContactFormOpen,
    calendlyModalOpen,
    setCalendlyModalOpen,
    contactFormData,
    calendlyData,
    agentSuggestions,
    handleSuggestionClick,
  } = useVoiceAgent({ portfolioContext });

  // Ref for auto-scrolling transcript container
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Track if user manually scrolled up
  useEffect(() => {
    const container = transcriptContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      userScrolledUp.current = !isAtBottom;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if user hasn't scrolled up)
  useEffect(() => {
    if (transcriptContainerRef.current && transcriptItems.length > 0 && !userScrolledUp.current) {
      const container = transcriptContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcriptItems]);

  return (
    <section
      id="voice"
      className="py-20 bg-gradient-primary dark:bg-gradient-to-br dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 relative overflow-hidden"
    >
      <AnimatedBackground />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-primary">
            Voice Agent
          </h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto">
            Realtime Conversational AI.
          </p>
        </motion.div>

        {/* Voice Agent Interface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full flex justify-center"
        >
          <div className="w-full max-w-4xl bg-theme-secondary glass rounded-xl border border-theme-primary/30 overflow-hidden shadow-lg">
            {/* Header - shows when connected or has transcript */}
            {(sessionStatus === 'CONNECTED' || transcriptItems.length > 0) && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-theme-primary/20">
                <div className="flex items-center gap-2">
                  {sessionStatus === 'CONNECTED' ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Live
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Session Ended
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {transcriptItems.length > 0 && (
                    <button
                      onClick={resetChat}
                      className="text-xs text-indigo-500 hover:text-indigo-400 font-medium cursor-pointer transition-colors"
                    >
                      New Chat
                    </button>
                  )}
                  {sessionStatus === 'CONNECTED' ? (
                    <button
                      onClick={toggleConnection}
                      className="text-xs text-red-500 hover:text-red-400 font-medium cursor-pointer transition-colors"
                    >
                      End Session
                    </button>
                  ) : (
                    <button
                      onClick={toggleConnection}
                      className="text-xs text-green-500 hover:text-green-400 font-medium cursor-pointer transition-colors"
                    >
                      Reconnect
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Voice Conversation Messages */}
            <div
              ref={transcriptContainerRef}
              className={`${
                sessionStatus === 'CONNECTED' ? 'h-72' : 'h-80'
              } overflow-y-auto p-6`}
            >
              <div className="flex flex-col h-full gap-y-4">
                {transcriptItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <PlayButton
                      sessionStatus={sessionStatus}
                      onToggle={toggleConnection}
                    />

                    <p className="text-sm text-theme-secondary text-center mb-4">
                      {sessionStatus === 'CONNECTING'
                        ? 'Connecting...'
                        : sessionStatus === 'CONNECTED'
                          ? 'Connected! Waiting for response...'
                          : 'Click to start, or choose an option below'}
                    </p>

                    {/* Show suggestions as chips when disconnected */}
                    {sessionStatus === 'DISCONNECTED' && (
                      <SuggestionChips
                        suggestions={DEFAULT_SUGGESTIONS}
                        onSelect={handleSuggestionClick}
                        variant="default"
                      />
                    )}
                  </div>
                ) : (
                  <VoiceTranscript items={transcriptItems} />
                )}
              </div>
            </div>

            {/* Context Pills - Show when connected and conversation started */}
            {sessionStatus === 'CONNECTED' && !contactFormOpen && transcriptItems.length > 0 && (
              <div className="px-6 py-2">
                <ContextPills
                  skills={skills.map(s => ({
                    id: s.name.toLowerCase().replace(/\s+/g, '-'),
                    name: s.name,
                    category: s.category,
                  }))}
                  projects={[
                    // Resume featured projects first
                    ...((resumeData as any).projects || []).map((p: any) => ({
                      id: p.name.toLowerCase().replace(/\s+/g, '-'),
                      name: p.name,
                      description: p.description || '',
                    })),
                    // Then GitHub repos not already in the resume list
                    ...projects
                      .filter(p => !((resumeData as any).projects || []).some(
                        (rp: any) => rp.name.toLowerCase() === p.title.toLowerCase()
                      ))
                      .map(p => ({
                        id: p.title.toLowerCase().replace(/\s+/g, '-'),
                        name: p.title,
                        description: p.description,
                      })),
                  ]}
                  experiences={experiences.map(e => ({
                    id: e.company.toLowerCase().replace(/\s+/g, '-'),
                    company: e.company,
                    role: e.position,
                  }))}
                  onSelect={handleSuggestionClick}
                  activeContext={
                    agentSuggestions?.type === 'skill' ? 'skills' :
                    agentSuggestions?.type === 'project' ? 'projects' :
                    agentSuggestions?.type === 'experience' ? 'experience' :
                    null
                  }
                />
              </div>
            )}

            {/* Chat Input OR Contact Form */}
            {sessionStatus === 'CONNECTED' && (
              contactFormOpen ? (
                <InlineContactForm
                  onClose={() => setContactFormOpen(false)}
                  initialSubject={contactFormData.subject}
                  initialContext={contactFormData.context}
                />
              ) : (
                <ChatInput
                  onSend={sendMessage}
                  disabled={sessionStatus !== 'CONNECTED'}
                  placeholder="Type a message to the voice agent…"
                />
              )
            )}
          </div>
        </motion.div>

        {/* Features Grid */}
        <VoiceFeatureGrid />
      </div>

      {/* Calendly Modal */}
      <CalendlyModal
        isOpen={calendlyModalOpen}
        onClose={() => setCalendlyModalOpen(false)}
        calendlyUrl={calendlyData.url}
      />
    </section>
  );
};

export default VoiceAISection;
