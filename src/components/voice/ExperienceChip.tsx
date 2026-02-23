'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, MapPin, Calendar } from 'lucide-react';

interface ExperienceChipProps {
  company: string;
  role: string;
  duration?: string;
  location?: string;
  description?: string;
  onSelect: (message: string) => void;
}

export const ExperienceChip: React.FC<ExperienceChipProps> = ({
  company,
  role,
  duration,
  location,
  description,
  onSelect,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      <motion.button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelect(`Tell me about the ${role} role at ${company}`)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 dark:bg-white/5 hover:bg-purple-500/20 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
      >
        <Building2 className="h-3.5 w-3.5 text-purple-500" />
        <span>{company}</span>
      </motion.button>

      {/* Hover Preview Card */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Header with gradient */}
              <div className="h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 relative overflow-hidden flex items-center justify-center">
                <Building2 className="h-8 w-8 text-purple-500/50" />
              </div>
              
              {/* Info section */}
              <div className="p-3">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  {role}
                </h4>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-2">
                  {company}
                </p>
                
                {/* Meta info */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {duration && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {duration}
                    </span>
                  )}
                  {location && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3 w-3" />
                      {location}
                    </span>
                  )}
                </div>
                
                {description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                    {description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExperienceChip;
