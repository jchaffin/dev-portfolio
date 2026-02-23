'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Code2, Sparkles } from 'lucide-react';

interface SkillChipProps {
  name: string;
  category?: string;
  proficiency?: string;
  onSelect: (message: string) => void;
}

// Color mapping for skill categories
const getCategoryColor = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'frontend': return 'text-blue-500 bg-blue-500/10';
    case 'backend': return 'text-green-500 bg-green-500/10';
    case 'ai': case 'ml': case 'voice ai': return 'text-purple-500 bg-purple-500/10';
    case 'language': return 'text-orange-500 bg-orange-500/10';
    case 'database': return 'text-cyan-500 bg-cyan-500/10';
    default: return 'text-slate-500 bg-slate-500/10';
  }
};

export const SkillChip: React.FC<SkillChipProps> = ({
  name,
  category,
  proficiency,
  onSelect,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const colorClass = getCategoryColor(category);

  return (
    <div className="relative">
      <motion.button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelect(`Tell me about your experience with ${name}`)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 dark:bg-white/5 hover:bg-emerald-500/20 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
      >
        <Code2 className="h-3.5 w-3.5 text-emerald-500" />
        <span>{name}</span>
      </motion.button>

      {/* Hover Preview Card */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${colorClass}`}>
                  <Code2 className="h-4 w-4" />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  {name}
                </h4>
              </div>
              
              {category && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Category: {category}
                </p>
              )}
              
              {proficiency && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  {proficiency}
                </div>
              )}
              
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Click to learn more
              </p>
            </div>
            
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SkillChip;
