'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Code2, Briefcase, Building2, ChevronDown, Zap, Mail, Calendar } from 'lucide-react';
import type { ProjectSuggestion, ExperienceSuggestion, SkillSuggestion } from './types';

interface ContextPillsProps {
  projects?: ProjectSuggestion[];
  experiences?: ExperienceSuggestion[];
  skills?: SkillSuggestion[];
  onSelect: (message: string) => void;
  activeContext?: 'skills' | 'projects' | 'experience' | null;
}

type DropdownType = 'actions' | 'skills' | 'projects' | 'experience' | null;

export const ContextPills: React.FC<ContextPillsProps> = ({
  projects,
  experiences,
  skills,
  onSelect,
  activeContext,
}) => {
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (message: string) => {
    onSelect(message);
    setOpenDropdown(null);
  };

  const toggleDropdown = (type: DropdownType) => {
    setOpenDropdown(openDropdown === type ? null : type);
  };

  const pillBaseClass = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer";
  const pillInactiveClass = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600";
  const pillActiveClass = "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30";

  return (
    <div ref={containerRef} className="flex items-center gap-2 flex-wrap">
      {/* Actions Pill */}
      <div className="relative">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown('actions');
          }}
          className={`${pillBaseClass} ${openDropdown === 'actions' ? pillActiveClass : pillInactiveClass}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Actions</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === 'actions' ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {openDropdown === 'actions' && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="p-1.5">
                <button
                  onClick={() => handleSelect("I'd like to send Jacob an email")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors"
                >
                  <Mail className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Send an email
                  </div>
                </button>
                <button
                  onClick={() => handleSelect("I want to schedule a meeting with Jacob")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors"
                >
                  <Calendar className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Schedule a meeting
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skills Pill */}
      <div className="relative">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown('skills');
          }}
          className={`${pillBaseClass} ${activeContext === 'skills' || openDropdown === 'skills' ? pillActiveClass : pillInactiveClass}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>Skills</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === 'skills' ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {openDropdown === 'skills' && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-56 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="p-1.5">
                {skills?.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => handleSelect(`Tell me about Jacob's ${skill.name} skills`)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors"
                  >
                    <Code2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Projects Pill */}
      <div className="relative">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown('projects');
          }}
          className={`${pillBaseClass} ${activeContext === 'projects' || openDropdown === 'projects' ? pillActiveClass : pillInactiveClass}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Projects</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === 'projects' ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {openDropdown === 'projects' && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-64 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="p-1.5">
                {projects?.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelect(`Tell me about the ${project.name} project`)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors"
                  >
                    <Briefcase className="h-4 w-4 text-indigo-500 flex-shrink-0" />
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
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Experience Pill */}
      <div className="relative">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown('experience');
          }}
          className={`${pillBaseClass} ${activeContext === 'experience' || openDropdown === 'experience' ? pillActiveClass : pillInactiveClass}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Experience</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === 'experience' ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {openDropdown === 'experience' && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-64 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="p-1.5">
                {experiences?.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => handleSelect(`Tell me about Jacob's experience at ${exp.company}`)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-left transition-colors"
                  >
                    <Building2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ContextPills;
