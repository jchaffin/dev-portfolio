'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { createPortal } from 'react-dom';

interface LinkWithPreviewProps {
  href: string;
  children: React.ReactNode;
  variant?: 'default' | 'light';
}

export const LinkWithPreview: React.FC<LinkWithPreviewProps> = ({ href, children, variant = 'default' }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const linkRef = useRef<HTMLAnchorElement>(null);

  const fullUrl = href?.startsWith('http') ? href : `https://${href || ''}`;
  
  let domain = '';
  try {
    domain = new URL(fullUrl).hostname.replace('www.', '');
  } catch {
    domain = fullUrl;
  }
  
  const screenshotUrl = `/api/screenshot?url=${encodeURIComponent(fullUrl)}`;

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
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <img
          src={screenshotUrl}
          alt={`${domain} preview`}
          className={`w-full h-full object-cover object-top transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <span className="text-sm">Preview unavailable</span>
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs font-medium text-slate-800 dark:text-white truncate">{domain}</div>
        <div className="text-[10px] text-slate-500 truncate">{fullUrl}</div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <a
        ref={linkRef}
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => {
          setShowPreview(true);
          setImageLoaded(false);
          setImageError(false);
        }}
        onMouseLeave={() => setShowPreview(false)}
        className={`underline underline-offset-2 transition-colors ${
          variant === 'light'
            ? 'text-white/90 hover:text-white decoration-white/50 hover:decoration-white'
            : 'text-blue-500 hover:text-blue-400 decoration-blue-500/50 hover:decoration-blue-400'
        }`}
      >
        {children}
        <ExternalLink className="h-3 w-3 inline-block ml-0.5 opacity-60" />
      </a>
      {preview}
    </>
  );
};

export default LinkWithPreview;
