'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/** Deep dive data from /api/projects/research */
export interface ProjectDeepDive {
  title: string;
  body: string;
  images?: string[];
  website?: string;
  citations?: string[];
}

export type DeepDiveState = {
  title: string;
  website?: string;
  data: ProjectDeepDive | null;
  key?: string;
  projectImages?: string[];
} | null;

function getCodeBlockText(children: React.ReactNode): string {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(getCodeBlockText).join('');
  if (typeof children === 'object' && children !== null && 'props' in children) {
    const c = (children as { props?: { children?: React.ReactNode } }).props?.children;
    return getCodeBlockText(c);
  }
  return String(children);
}

function MermaidBlock({ chart }: { chart: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [content, setContent] = React.useState<{ type: 'svg'; html: string } | { type: 'error'; code: string } | null>(null);
  const id = React.useId().split(':').join('');
  const safeId = `mermaid-${id}`;

  React.useEffect(() => {
    if (!chart.trim() || !ref.current) return;
    let cancelled = false;
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const themeVars = isDark
      ? {
          primaryColor: '#334155',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#475569',
          lineColor: '#3b82f6',
          secondaryColor: '#1e293b',
          tertiaryColor: '#64748b',
          background: '#0f172a',
          nodeBkg: '#334155',
          nodeBorder: '#475569',
          textColor: '#f8fafc',
          mainBkg: '#334155',
          nodeTextColor: '#f8fafc',
          arrowheadColor: '#3b82f6',
        }
      : {
          primaryColor: '#f1f5f9',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#e2e8f0',
          lineColor: '#2563eb',
          secondaryColor: '#f8fafc',
          tertiaryColor: '#94a3b8',
          background: '#ffffff',
          nodeBkg: '#f1f5f9',
          nodeBorder: '#e2e8f0',
          textColor: '#0f172a',
          mainBkg: '#f1f5f9',
          nodeTextColor: '#0f172a',
          arrowheadColor: '#2563eb',
        };
    import('mermaid')
      .then((m) => m.default)
      .then((mermaid) => {
        if (cancelled || !ref.current) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'base',
          themeVariables: themeVars,
        });
        return mermaid.render(safeId, chart.trim());
      })
      .then((result) => {
        if (cancelled || !result?.svg) return;
        setContent({ type: 'svg', html: result.svg });
      })
      .catch(() => {
        if (cancelled) return;
        setContent({ type: 'error', code: chart });
      });
    return () => {
      cancelled = true;
    };
  }, [chart, safeId]);

  if (content?.type === 'svg') {
    return (
      <div
        className="not-prose my-4 [&_svg]:max-w-full [&_svg]:h-auto"
        ref={ref}
        dangerouslySetInnerHTML={{ __html: content.html }}
      />
    );
  }
  if (content?.type === 'error') {
    return (
      <pre className="not-prose my-4 overflow-x-auto rounded-lg bg-theme-tertiary p-4 text-sm text-theme-secondary">
        {content.code}
      </pre>
    );
  }
  return <div ref={ref} className="not-prose my-4 min-h-[80px] animate-pulse rounded-lg bg-theme-tertiary" />;
}

function formatUrlDisplay(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    let s = url.startsWith('https://') ? url.slice(8) : url.startsWith('http://') ? url.slice(7) : url;
    return s.endsWith('/') ? s.slice(0, -1) : s;
  }
}

function isCitationRef(text: string): boolean {
  if (text.length === 0) return false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] < '0' || text[i] > '9') return false;
  }
  return true;
}

interface DeepDiveModalProps {
  open: DeepDiveState;
  tab: 'overview' | 'images' | 'sources';
  onTabChange: (tab: 'overview' | 'images' | 'sources') => void;
  loading: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}

export function DeepDiveModal({ open, tab, onTabChange, loading, onClose, onRegenerate }: DeepDiveModalProps) {
  if (!open) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex flex-col bg-theme-primary rounded-2xl shadow-2xl border border-theme-primary overflow-hidden"
      >
        <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-theme-primary">
          <h3 className="text-xl font-bold text-theme-primary">
            {open.data ? open.data.title : `${open.title} — Loading…`}
          </h3>
          <div className="flex items-center gap-2">
            {open.data && open.key && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Regenerating…' : 'Regenerate'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {open.data ? (
            <>
              <div className="shrink-0 flex border-b border-theme-primary">
                <button
                  type="button"
                  onClick={() => onTabChange('overview')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    tab === 'overview'
                      ? 'text-accent-primary border-b-2 border-accent-primary -mb-px'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('images')}
                  className={`px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors ${
                    tab === 'images'
                      ? 'text-accent-primary border-b-2 border-accent-primary -mb-px'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Images
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('sources')}
                  className={`px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors ${
                    tab === 'sources'
                      ? 'text-accent-primary border-b-2 border-accent-primary -mb-px'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Sources
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {tab === 'overview' ? (
                  <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:text-theme-secondary prose-headings:text-theme-primary prose-strong:text-theme-primary [&_.katex]:text-inherit">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code: ({ node, className, children, ...props }) => {
                          const raw = getCodeBlockText(children).trim();
                          const lang = (className ?? '').startsWith('language-') ? (className ?? '').slice('language-'.length) : '';
                          if (lang === 'mermaid' && raw.length > 0) {
                            return <MermaidBlock chart={raw} />;
                          }
                          return (
                            <code className={className ?? ''} {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => {
                          const arr = React.Children.toArray(children);
                          const first = arr[0];
                          if (React.isValidElement(first) && first.type === MermaidBlock) return first;
                          if (arr.length === 1 && typeof first === 'object' && first !== null && 'props' in first) {
                            const props = (first as { props?: { className?: string; children?: React.ReactNode } }).props;
                            if (props?.className && String(props.className).includes('language-mermaid')) {
                              const raw = getCodeBlockText(props?.children).trim();
                              if (raw.length > 0) return <MermaidBlock chart={raw} />;
                            }
                          }
                          return <pre>{children}</pre>;
                        },
                        a: ({ href, children }) => {
                          const text = String(children ?? '').trim();
                          if (isCitationRef(text) && href) {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex align-baseline no-underline ml-0.5"
                                title={href}
                                aria-label={`Source ${text}`}
                              >
                                <span className="inline-flex items-center justify-center min-w-[1.35em] h-[1.35em] text-[0.7em] font-semibold rounded-md bg-theme-tertiary text-theme-primary border border-theme-primary/40 hover:bg-theme-primary/10 hover:border-theme-primary/60 transition-colors">
                                  {text}
                                </span>
                              </a>
                            );
                          }
                          return (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-primary underline">
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {open.data.body}
                    </ReactMarkdown>
                  </div>
                ) : tab === 'sources' ? (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-theme-secondary mb-4">Sources</h4>
                    {open.data.citations && open.data.citations.length > 0 ? (
                      <ul className="divide-y divide-theme-primary/50">
                        {open.data.citations.map((url, i) => (
                          <li key={i}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 py-3 text-theme-primary hover:text-accent-primary transition-colors group"
                              title={url}
                            >
                              <span className="shrink-0 w-6 h-6 rounded-full bg-theme-tertiary text-theme-secondary group-hover:text-accent-primary flex items-center justify-center text-xs font-semibold">
                                {i + 1}
                              </span>
                              <span className="min-w-0 flex-1 font-medium truncate">{formatUrlDisplay(url)}</span>
                              <ExternalLink className="w-4 h-4 shrink-0 text-theme-secondary group-hover:text-accent-primary transition-colors" aria-hidden />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-theme-secondary">No sources for this overview.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[...(open.projectImages ?? []), ...(open.data.images ?? [])].map((src, i) => (
                      <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border border-theme-primary hover:border-accent-primary/50 transition-colors aspect-video bg-theme-tertiary"
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                    {(!open.projectImages || open.projectImages.length === 0) &&
                      (!open.data.images || open.data.images.length === 0) && (
                        <p className="col-span-full text-sm text-theme-secondary py-8">No images available for this project.</p>
                      )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-theme-tertiary border-t-accent-primary" />
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
