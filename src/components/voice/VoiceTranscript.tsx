'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { TranscriptItem, RichItem } from './types';
import { LinkWithPreview } from './LinkWithPreview';
import { ProjectLinkWithPreview } from './ProjectLinkWithPreview';
import { ProjectSummaryCard } from './ProjectSummaryCard';
import { MermaidDiagram } from './MermaidDiagram';
import resumeData from '@/data/resume.json';
import { getProjects, type Project } from '@/lib/getProjects';

// Generate name variations for matching in text
function generateNameVariations(name: string): string[] {
  const variations: Set<string> = new Set();
  
  // Original name
  variations.add(name);
  variations.add(name.toLowerCase());
  
  // Without dots (e.g., "Prosody.ai" -> "Prosodyai", "Prosody ai")
  if (name.includes('.')) {
    const noDots = name.replace(/\./g, '');
    variations.add(noDots);
    variations.add(noDots.toLowerCase());
    variations.add(name.replace(/\./g, ' '));
  }
  
  // No spaces version (e.g., "Wave Computing" -> "WaveComputing")
  if (name.includes(' ')) {
    const noSpaces = name.replace(/\s+/g, '');
    variations.add(noSpaces);
    variations.add(noSpaces.toLowerCase());
  }
  
  // With spaces between camelCase (e.g., "WaveComputing" -> "Wave Computing")
  const withSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (withSpaces !== name) {
    variations.add(withSpaces);
    variations.add(withSpaces.toLowerCase());
  }
  
  // Hyphenated version (e.g., "Prosody ai" -> "prosody-ai")
  variations.add(name.toLowerCase().replace(/[\s.]+/g, '-'));
  
  return Array.from(variations);
}

interface VoiceTranscriptProps {
  items: TranscriptItem[];
  richItems?: RichItem[];
}

export const VoiceTranscript: React.FC<VoiceTranscriptProps> = ({ items, richItems = [] }) => {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  // Experience links from resume (only with websites)
  const experienceLinks = useMemo(() => {
    return (resumeData.experience || [])
      .filter(exp => exp.website && exp.company)
      .map(exp => {
        // Combine auto-generated variations with explicit aliases from resume
        const autoAliases = generateNameVariations(exp.company);
        const explicitAliases = (exp as any).aliases || [];
        const allAliases = Array.from(new Set([...autoAliases, ...explicitAliases]));
        
        return { 
          name: exp.company, 
          url: exp.website,
          aliases: allAliases
        };
      });
  }, []);

  // Project links (only with github or live)
  const projectLinks = useMemo(() => {
    return projects
      .filter(p => p.github || p.live)
      .map(p => ({
        name: p.title,
        githubUrl: p.github,
        liveUrl: p.live,
        description: p.description,
        aliases: generateNameVariations(p.title),
      }));
  }, [projects]);

  const filteredItems = items.filter(
    (item) =>
      item.type === 'MESSAGE' &&
      !item.isHidden &&
      item.title?.replace(/[\s.…]+/g, '').length > 0
  );

  // Merge transcript messages and rich items sorted by createdAtMs
  const mergedRows = useMemo(() => {
    type Row =
      | { kind: 'transcript'; item: TranscriptItem }
      | { kind: 'rich'; item: RichItem };

    if (richItems.length === 0) {
      return filteredItems.map((item): Row => ({ kind: 'transcript', item }));
    }

    const sorted = [...richItems].sort((a, b) => a.createdAtMs - b.createdAtMs);
    const result: Row[] = [];
    let richIdx = 0;

    for (let i = 0; i < filteredItems.length; i++) {
      const current = filteredItems[i];
      const next = filteredItems[i + 1];
      result.push({ kind: 'transcript', item: current });

      // Insert rich items whose timestamp falls between this message and the next
      while (richIdx < sorted.length) {
        const ri = sorted[richIdx];
        const afterCurrent = ri.createdAtMs >= current.createdAtMs;
        const beforeNext = !next || ri.createdAtMs < next.createdAtMs;
        if (afterCurrent && beforeNext) {
          result.push({ kind: 'rich', item: ri });
          richIdx++;
        } else {
          break;
        }
      }
    }

    // Append remaining rich items (newer than all transcript messages)
    while (richIdx < sorted.length) {
      result.push({ kind: 'rich', item: sorted[richIdx++] });
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems, richItems]);

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {mergedRows.map((row) => {
        if (row.kind === 'rich') {
          const ri = row.item;
          if (ri.type === 'project_card') {
            return (
              <motion.div
                key={ri.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <ProjectSummaryCard data={ri.data} />
              </motion.div>
            );
          }
          if (ri.type === 'mermaid') {
            return (
              <motion.div
                key={ri.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <MermaidDiagram definition={ri.data.definition} title={ri.data.title} />
              </motion.div>
            );
          }
          return null;
        }

        const item = row.item;
        const isUser = item.role === 'user';
        const isStreaming = item.status === 'IN_PROGRESS' && !isUser;
        const title = item.title || '';
        const displayTitle = title.startsWith('[') && title.endsWith(']')
          ? title.slice(1, -1)
          : title;

        return (
          <motion.div
            key={item.itemId}
            layout="position"
            initial={{ opacity: 0, x: isUser ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-lg p-3 rounded-xl ${
                isUser
                  ? 'bg-accent-secondary text-white'
                  : 'bg-theme-tertiary text-theme-primary'
              }`}
            >
              <div
                className={`text-xs font-mono mb-1 ${
                  isUser ? 'text-white/80' : 'text-theme-secondary'
                }`}
              >
                {item.timestamp}
              </div>
              <div className="whitespace-pre-wrap">
                <ParsedText
                  text={displayTitle}
                  variant={isUser ? 'light' : 'default'}
                  experienceLinks={experienceLinks}
                  projectLinks={projectLinks}
                />
                {isStreaming && (
                  <motion.span
                    className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-text-bottom rounded-full opacity-80"
                    animate={{ opacity: [0.8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
};

interface ParsedTextProps {
  text: string;
  variant: 'default' | 'light';
  experienceLinks: { name: string; url: string; aliases?: string[] }[];
  projectLinks: { name: string; githubUrl?: string; liveUrl?: string; description?: string }[];
}

// Check if a match at given index is a whole word (not part of another word)
const isWholeWord = (text: string, index: number, length: number): boolean => {
  const charBefore = index > 0 ? text[index - 1] : ' ';
  const charAfter = index + length < text.length ? text[index + length] : ' ';
  // Word boundary = not alphanumeric
  const isWordBoundary = (c: string) => !/[a-zA-Z0-9]/.test(c);
  return isWordBoundary(charBefore) && isWordBoundary(charAfter);
};

const ParsedText: React.FC<ParsedTextProps> = ({ text, variant, experienceLinks, projectLinks }) => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; node: React.ReactNode } | null = null;

    // Check for URLs
    const httpIndex = remaining.toLowerCase().indexOf('http');
    if (httpIndex !== -1) {
      const endIndex = remaining.indexOf(' ', httpIndex);
      const url = endIndex === -1 ? remaining.slice(httpIndex) : remaining.slice(httpIndex, endIndex);
      if (!earliestMatch || httpIndex < earliestMatch.index) {
        earliestMatch = {
          index: httpIndex,
          length: url.length,
          node: <LinkWithPreview key={key++} href={url} variant={variant}>{url}</LinkWithPreview>,
        };
      }
    }

    // Check experience names and aliases (case insensitive, whole word only)
    for (const exp of experienceLinks) {
      // Check main name
      const namesToCheck = [exp.name, ...(exp.aliases || [])];
      
      for (const nameToCheck of namesToCheck) {
        const lowerRemaining = remaining.toLowerCase();
        const lowerName = nameToCheck.toLowerCase();
        let searchStart = 0;
        
        // Find a whole-word match (not substring of another word)
        while (searchStart < remaining.length) {
          const index = lowerRemaining.indexOf(lowerName, searchStart);
          if (index === -1) break;
          
          if (isWholeWord(remaining, index, nameToCheck.length)) {
            if (!earliestMatch || index < earliestMatch.index) {
              earliestMatch = {
                index,
                length: nameToCheck.length,
                node: <LinkWithPreview key={key++} href={exp.url} variant={variant}>{remaining.slice(index, index + nameToCheck.length)}</LinkWithPreview>,
              };
            }
            break;
          }
          searchStart = index + 1;
        }
      }
    }

    // Check project names (case insensitive, whole word only)
    for (const proj of projectLinks) {
      const lowerRemaining = remaining.toLowerCase();
      const lowerName = proj.name.toLowerCase();
      let searchStart = 0;
      
      // Find a whole-word match (not substring of another word like "ava" in "avatar")
      while (searchStart < remaining.length) {
        const index = lowerRemaining.indexOf(lowerName, searchStart);
        if (index === -1) break;
        
        if (isWholeWord(remaining, index, proj.name.length)) {
          if (!earliestMatch || index < earliestMatch.index) {
            earliestMatch = {
              index,
              length: proj.name.length,
              node: (
                <ProjectLinkWithPreview
                  key={key++}
                  name={remaining.slice(index, index + proj.name.length)}
                  githubUrl={proj.githubUrl}
                  liveUrl={proj.liveUrl}
                  description={proj.description}
                  variant={variant}
                />
              ),
            };
          }
          break;
        }
        searchStart = index + 1;
      }
    }

    if (earliestMatch) {
      if (earliestMatch.index > 0) {
        parts.push(remaining.slice(0, earliestMatch.index));
      }
      parts.push(earliestMatch.node);
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return <>{parts}</>;
};

export default VoiceTranscript;
