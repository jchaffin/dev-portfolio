'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Calendar, Briefcase, Code2, MessageCircle, Layout, ChevronDown, Sparkles, ExternalLink, Github, RefreshCw } from 'lucide-react';
import type { Suggestion, ProjectSuggestion, ExperienceSuggestion, SkillSuggestion, SectionSuggestion } from './types';

interface SuggestionChipsProps {
  suggestions?: Suggestion[];
  projects?: ProjectSuggestion[];
  experiences?: ExperienceSuggestion[];
  skills?: SkillSuggestion[];
  sections?: SectionSuggestion[];
  onSelect: (message: string) => void;
  onNewChat?: () => void;
  prompt?: string;
  variant?: 'default' | 'connected' | 'project' | 'experience' | 'skill' | 'section';
}

// Icon mapping for suggestion types
const getSuggestionIcon = (id: string) => {
  switch (id) {
    case 'email': return <FileText className="h-4 w-4" />;
    case 'meeting': return <Calendar className="h-4 w-4" />;
    case 'projects': return <Briefcase className="h-4 w-4" />;
    case 'skills': return <Code2 className="h-4 w-4" />;
    case 'experience': return <Briefcase className="h-4 w-4" />;
    case 'about': return <Layout className="h-4 w-4" />;
    default: return <MessageCircle className="h-4 w-4" />;
  }
};

// Get category icon for dropdown
const getCategoryIcon = (variant: string) => {
  switch (variant) {
    case 'project': return <Briefcase className="h-4 w-4" />;
    case 'experience': return <Briefcase className="h-4 w-4" />;
    case 'skill': return <Code2 className="h-4 w-4" />;
    case 'section': return <Layout className="h-4 w-4" />;
    default: return <Sparkles className="h-4 w-4" />;
  }
};

// Get dropdown title based on variant
const getDropdownTitle = (variant: string) => {
  switch (variant) {
    case 'project': return 'Projects';
    case 'experience': return 'Experience';
    case 'skill': return 'Skills';
    case 'section': return 'Sections';
    default: return 'Suggestions';
  }
};

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  projects,
  experiences,
  skills,
  sections,
  onSelect,
  onNewChat,
  prompt,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isConnected = ['connected', 'project', 'experience', 'skill', 'section'].includes(variant);
  const isProjectView = variant === 'project' || (projects && projects.length > 0);
  const isExperienceView = variant === 'experience' || (experiences && experiences.length > 0);
  const isSkillView = variant === 'skill' || (skills && skills.length > 0);
  const isSectionView = variant === 'section' || (sections && sections.length > 0);

  // Determine current view type for dropdown title
  const currentViewType = isSkillView ? 'skill' : 
    isExperienceView ? 'experience' : 
    isProjectView ? 'project' : 
    isSectionView ? 'section' : 'default';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (message: string) => {
    onSelect(message);
    setIsOpen(false);
  };

  // Check if there are any items to show
  const hasItems = (suggestions && suggestions.length > 0) ||
    (projects && projects.length > 0) ||
    (experiences && experiences.length > 0) ||
    (skills && skills.length > 0) ||
    (sections && sections.length > 0);

  if (!hasItems) return null;

  // For disconnected state, show chips directly (not dropdown)
  if (variant === 'default' && suggestions && suggestions.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center gap-2"
      >
        {prompt && (
          <p className="text-sm text-theme-secondary text-center">{prompt}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2 max-w-lg px-4">
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion.id}
              onClick={() => onSelect(suggestion.message)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-theme-tertiary hover:bg-theme-secondary backdrop-blur-sm border border-border-primary rounded-lg text-sm font-medium text-theme-primary hover:text-theme-primary shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-indigo-500 dark:text-indigo-400">
                {getSuggestionIcon(suggestion.id)}
              </span>
              <span>{suggestion.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  // For connected state, show as dropdown menu
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative inline-block"
      ref={dropdownRef}
    >
      {/* Dropdown Trigger Button */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 dark:bg-indigo-400/10 dark:hover:bg-indigo-400/20 backdrop-blur-sm border border-indigo-500/30 dark:border-indigo-400/30 rounded-lg text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-indigo-500 dark:text-indigo-400">
          {getCategoryIcon(currentViewType)}
        </span>
        <span>{getDropdownTitle(currentViewType)}</span>
        <ChevronDown 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-72 max-h-72 overflow-y-auto bg-white dark:bg-slate-800 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* New Chat option */}
            {onNewChat && (
              <div className="p-1.5 border-b border-slate-200 dark:border-slate-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewChat();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg text-left transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                    <RefreshCw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    New Chat
                  </div>
                </button>
              </div>
            )}
            {/* Prompt header if available */}
            {prompt && (
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">{prompt}</p>
              </div>
            )}
            <div className="p-1.5" onClick={(e) => e.stopPropagation()}>
              {/* Skill items */}
              {isSkillView && skills && skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => handleSelect(`Tell me about Jacob's ${skill.name} skills`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                    <Code2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {skill.name}
                    </div>
                    {skill.category && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {skill.category}
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {/* Experience items */}
              {!isSkillView && isExperienceView && experiences && experiences.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => handleSelect(`Tell me about Jacob's experience at ${exp.company}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                    <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {exp.company}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {exp.role}
                    </div>
                  </div>
                </button>
              ))}

              {/* Project items */}
              {!isSkillView && !isExperienceView && isProjectView && projects && projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(`Tell me about the ${project.name} project`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                    <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {project.name}
                    </div>
                    {project.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {project.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    {project.url && (
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    )}
                    {project.github && (
                      <Github className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                </button>
              ))}

              {/* Section items */}
              {!isSkillView && !isExperienceView && !isProjectView && isSectionView && sections && sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSelect(`Tell me about ${section.label}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                    <Layout className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {section.label}
                  </div>
                </button>
              ))}

              {/* Regular action items */}
              {!isProjectView && !isExperienceView && !isSkillView && !isSectionView && suggestions && suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSelect(suggestion.message)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {getSuggestionIcon(suggestion.id)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {suggestion.label}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Default suggestions for disconnected state (action-based)
export const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { id: "email", label: "Send an email", message: "I'd like to send Jacob an email" },
  { id: "meeting", label: "Schedule a meeting", message: "I want to schedule a meeting with Jacob" },
  { id: "projects", label: "Discuss projects", message: "Tell me about Jacob's projects" },
  { id: "skills", label: "Technical skills", message: "What are Jacob's technical skills?" },
];

// Context suggestions for connected state dropdown (category-based)
export const CONTEXT_SUGGESTIONS: Suggestion[] = [
  { id: "skills", label: "Skills", message: "What are Jacob's technical skills?" },
  { id: "projects", label: "Projects", message: "Tell me about Jacob's projects" },
  { id: "experience", label: "Experience", message: "Tell me about Jacob's work experience" },
];

export default SuggestionChips;
