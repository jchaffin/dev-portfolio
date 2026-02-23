'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Github, ExternalLink } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ProjectLinkWithPreviewProps {
  name: string;
  githubUrl?: string;
  liveUrl?: string;
  description?: string;
  variant?: 'default' | 'light';
}

export const ProjectLinkWithPreview: React.FC<ProjectLinkWithPreviewProps> = ({
  name,
  githubUrl,
  liveUrl,
  description,
  variant = 'default',
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const linkRef = useRef<HTMLAnchorElement>(null);

  const previewUrl = githubUrl || liveUrl;
  const screenshotUrl = previewUrl ? `/api/screenshot?url=${encodeURIComponent(previewUrl)}` : null;
  const linkUrl = liveUrl || githubUrl;

  useEffect(() => {
    if (showPreview && linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [showPreview]);

  const preview = showPreview && typeof document !== 'undefined' ? createPortal(
    <div 
      className="fixed z-[99999] w-56 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="w-full h-28 bg-slate-100 dark:bg-slate-900 relative">
        {screenshotUrl && !imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={screenshotUrl}
              alt={`${name} preview`}
              className={`w-full h-full object-cover object-top transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              referrerPolicy="no-referrer"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
            <span className="text-2xl font-bold text-indigo-500/30">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      
      <div className="px-2 py-1.5 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs font-medium text-slate-800 dark:text-white truncate">{name}</div>
        {description && (
          <div className="text-[10px] text-slate-500 line-clamp-1">{description}</div>
        )}
        <div className="flex gap-2 mt-1">
          {githubUrl && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Github className="h-2.5 w-2.5" /> GitHub
            </span>
          )}
          {liveUrl && (
            <span className="text-[10px] text-indigo-400 flex items-center gap-0.5">
              <ExternalLink className="h-2.5 w-2.5" /> Live
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <a
        ref={linkRef}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => {
          setShowPreview(true);
          setImageLoaded(false);
          setImageError(false);
        }}
        onMouseLeave={() => setShowPreview(false)}
        className={`underline underline-offset-2 transition-colors font-medium ${
          variant === 'light'
            ? 'text-white/90 hover:text-white decoration-white/50 hover:decoration-white'
            : 'text-indigo-500 hover:text-indigo-400 decoration-indigo-500/50 hover:decoration-indigo-400'
        }`}
      >
        {name}
        {githubUrl && <Github className="h-3 w-3 inline-block ml-1 opacity-60" />}
        {!githubUrl && liveUrl && <ExternalLink className="h-3 w-3 inline-block ml-1 opacity-60" />}
      </a>
      {preview}
    </>
  );
};

export default ProjectLinkWithPreview;
