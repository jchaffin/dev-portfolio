'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Github, X } from 'lucide-react';

interface ProjectPreviewCardProps {
  name: string;
  description?: string;
  liveUrl?: string;
  githubUrl?: string;
  tech?: string[];
  onClose?: () => void;
}

export const ProjectPreviewCard: React.FC<ProjectPreviewCardProps> = ({
  name,
  description,
  liveUrl,
  githubUrl,
  tech,
  onClose,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Use screenshot API for the preview URL (prefer live URL, fallback to GitHub)
  const previewUrl = liveUrl || githubUrl;
  const screenshotUrl = previewUrl ? `/api/screenshot?url=${encodeURIComponent(previewUrl)}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="relative bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden w-64"
    >
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-1.5 right-1.5 z-10 p-0.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Screenshot Preview */}
      <div className="relative w-full h-32 bg-slate-100 dark:bg-slate-900">
        {screenshotUrl && !imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
            <span className="text-3xl font-bold text-indigo-500/30">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-0.5">
          {name}
        </h3>
        
        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
            {description}
          </p>
        )}

        {/* Tech tags */}
        {tech && tech.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tech.slice(0, 3).map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                {t}
              </span>
            ))}
            {tech.length > 3 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">
                +{tech.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-md transition-colors"
            >
              <Github className="h-3 w-3" />
              <span>GitHub</span>
            </a>
          )}
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Live</span>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectPreviewCard;
