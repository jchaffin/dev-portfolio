'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { TranscriptItem } from './types';
import { LinkWithPreview } from './LinkWithPreview';
import { ProjectLinkWithPreview } from './ProjectLinkWithPreview';
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
}

export const VoiceTranscript: React.FC<VoiceTranscriptProps> = ({ items }) => {
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

  const filteredItems = items
    .filter(item => item.type === "MESSAGE" && !item.isHidden)
    .sort((a, b) => a.createdAtMs - b.createdAtMs);

  return (
    <>
      {filteredItems.map((item) => {
        const isUser = item.role === "user";
        const title = item.title || "";
        const displayTitle = title.startsWith("[") && title.endsWith("]")
          ? title.slice(1, -1)
          : title;

        return (
          <div
            key={item.itemId}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-lg p-3 rounded-xl ${
                isUser
                  ? "bg-accent-secondary text-white"
                  : "bg-theme-tertiary text-theme-primary"
              }`}
            >
              <div
                className={`text-xs font-mono mb-1 ${
                  isUser ? "text-white/80" : "text-theme-secondary"
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
              </div>
            </div>
          </div>
        );
      })}
    </>
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
