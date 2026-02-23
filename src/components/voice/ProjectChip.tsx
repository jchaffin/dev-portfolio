'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Github } from 'lucide-react';

interface ProjectChipProps {
  name: string;
  description?: string;
  url?: string;
  github?: string;
  onSelect: (message: string) => void;
}

export const ProjectChip: React.FC<ProjectChipProps> = ({
  name,
  description,
  url,
  github,
  onSelect,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Use screenshot API for preview (prefer live URL, fallback to GitHub)
  const previewUrl = url || github;
  const screenshotUrl = previewUrl ? `/api/screenshot?url=${encodeURIComponent(previewUrl)}` : null;

  return (
    <div className="relative">
      <motion.button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelect(`Tell me about the ${name} project`)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 dark:bg-white/5 hover:bg-blue-500/20 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
      >
        <span>{name}</span>
        {(url || github) && (
          <ExternalLink className="h-3 w-3 opacity-50" />
        )}
      </motion.button>

      {/* Hover Preview Card */}
      <AnimatePresence>
        {isHovered && (url || github || description) && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Screenshot Preview */}
              <div className="h-28 bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                {screenshotUrl && !imageError ? (
                  <>
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <img
                      src={screenshotUrl}
                      alt={`${name} preview`}
                      className={`w-full h-full object-cover object-top transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                    <span className="text-2xl font-bold text-blue-500/30">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Info section */}
              <div className="p-2">
                <h4 className="font-semibold text-slate-900 dark:text-white text-xs mb-0.5">
                  {name}
                </h4>
                {description && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 mb-1.5">
                    {description}
                  </p>
                )}
                
                {/* Action links */}
                <div className="flex gap-2">
                  {github && (
                    <a
                      href={github}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Github className="h-2.5 w-2.5" />
                      GitHub
                    </a>
                  )}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      Live
                    </a>
                  )}
                </div>
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

export default ProjectChip;
