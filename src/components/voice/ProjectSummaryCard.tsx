'use client';

import React from 'react';
import { ExternalLink, Github } from 'lucide-react';
import type { ProjectCardData } from './types';

interface ProjectSummaryCardProps {
  data: ProjectCardData;
}

export const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({ data }) => (
  <div className="flex justify-start">
    <div className="max-w-lg w-full bg-theme-tertiary border border-indigo-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-theme-primary text-sm leading-snug">{data.name}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {data.github && (
            <a
              href={data.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${data.name} on GitHub`}
              className="text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
          )}
          {data.live && (
            <a
              href={data.live}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${data.name} live site`}
              className="text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {data.description && (
        <p className="text-xs text-theme-secondary leading-relaxed">{data.description}</p>
      )}

      {data.tech && data.tech.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.tech.map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);
