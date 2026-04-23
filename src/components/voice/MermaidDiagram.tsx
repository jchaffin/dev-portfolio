'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  definition: string;
  title?: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ definition, title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
    setError(null);

    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
      mermaid
        .render(id, definition.trim())
        .then(({ svg }) => {
          if (containerRef.current) containerRef.current.innerHTML = svg;
        })
        .catch((err) => setError(String(err)));
    });
  }, [definition]);

  return (
    <div className="flex justify-start">
      <div className="max-w-lg w-full bg-theme-tertiary border border-indigo-500/20 rounded-xl p-4">
        {title && (
          <div className="text-xs font-mono text-theme-secondary mb-2">{title}</div>
        )}
        {error ? (
          <div className="text-xs text-red-400 font-mono whitespace-pre-wrap">{error}</div>
        ) : (
          <div
            ref={containerRef}
            className="overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
          />
        )}
      </div>
    </div>
  );
};