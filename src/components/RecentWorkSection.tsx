'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink, Github, FileText, Layers } from 'lucide-react';
import Image from 'next/image';
import { getProjects, Project } from '@/lib/getProjects';
import resumeData from '@/data/resume.json';
import { DeepDiveModal, type ProjectDeepDive } from './DeepDiveModal';

function getDeepDiveKey(imagesPath?: string | null): string | null {
  if (!imagesPath) return null;
  const s = String(imagesPath).trim();
  const prefix = '/projects/';
  const idx = s.indexOf(prefix);
  if (idx === -1) return null;
  const rest = s.slice(idx + prefix.length);
  const end = rest.indexOf('/');
  const key = end === -1 ? rest : rest.slice(0, end);
  return key || null;
}

interface ProjectCarouselProps {
  title: string;
  description: string;
  images: string[];
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
  blogSlug?: string;
  deepDive?: ProjectDeepDive | null;
  onOpenDeepDive?: () => void;
  deepDiveLoading?: boolean;
}

const ProjectCarousel: React.FC<ProjectCarouselProps> = ({
  title,
  description,
  images,
  technologies,
  liveUrl,
  githubUrl,
  blogSlug,
  deepDive,
  onOpenDeepDive,
  deepDiveLoading,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeImages = images.length > 0 ? images : ['/projects/prosodyai/1.png'];

  const next = () => setCurrentIndex((i) => (i + 1) % safeImages.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + safeImages.length) % safeImages.length);

  return (
    <div className="h-full flex flex-col bg-theme-primary rounded-2xl overflow-hidden shadow-xl border border-theme-primary">
      {/* Image Carousel */}
      <div className="relative aspect-[4/3] bg-theme-tertiary overflow-hidden shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image
              src={safeImages[currentIndex]}
              alt={`${title} screenshot ${currentIndex + 1}`}
              fill
              sizes="(max-width: 1280px) 50vw, 25vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {safeImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {safeImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {safeImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-8 flex flex-col flex-1 min-h-0 overflow-y-auto">
        <div className="mb-3">
          <h3 className="text-lg lg:text-xl font-bold text-theme-primary mb-2">{title}</h3>
          <div className="flex gap-2">
            {deepDive && onOpenDeepDive && (
              <button
                type="button"
                onClick={onOpenDeepDive}
                disabled={deepDiveLoading}
                className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
                title="Deep dive"
              >
                <Layers className="w-5 h-5" />
              </button>
            )}
            {blogSlug && (
              <a
                href={`/blog/${blogSlug}`}
                className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                title="Read case study"
              >
                <FileText className="w-5 h-5" />
              </a>
            )}
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-theme-tertiary hover:bg-theme-secondary text-theme-secondary transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            )}
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        <p className="text-theme-secondary mb-4 leading-relaxed line-clamp-6 text-base lg:text-lg min-h-0">
          {description}
        </p>

        <div className="flex flex-wrap gap-2 mt-auto">
          {technologies.map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 text-sm lg:text-base rounded-full bg-theme-tertiary text-theme-secondary"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Image manifest — maps directory path to files on disk.
// Add entries here when you drop new screenshots into public/projects/.
const IMAGE_MANIFEST: Record<string, string[]> = {
  '/projects/prosodyai': ['6.png', '7.png', '1.png', '2.png', '3.png', '4.png', '5.png'],
  '/projects/sparke': ['1.jpeg', '2.jpeg', '3.jpeg'],
  '/projects/aureliastudio': ['1.png'],
  '/projects/outrival': ['1.png'],
};

function getProjectImages(imagesDir?: string): string[] {
  if (!imagesDir) return [];
  const files = IMAGE_MANIFEST[imagesDir];
  if (!files) return [`${imagesDir}/1.png`];
  return files.map(f => `${imagesDir}/${f}`);
}

/** Shape for carousel from API or resume fallback */
type FeaturedProject = {
  title: string;
  description: string;
  images: string[];
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
  imagesPath?: string;
};

function featuredFromResume(): FeaturedProject[] {
  return (resumeData as any).projects.map((proj: any) => ({
    title: proj.name,
    description: proj.description,
    images: getProjectImages(proj.images),
    technologies: proj.keywords || [],
    liveUrl: proj.website,
    githubUrl: proj.github,
    imagesPath: proj.images,
  }));
}

const ProjectCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="bg-theme-primary rounded-xl overflow-hidden shadow-lg border border-theme-primary hover:shadow-xl transition-shadow duration-300"
  >
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-theme-primary">
          {project.title}
        </h3>
        <div className="flex space-x-2">
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme-secondary hover:text-accent-primary transition-colors"
          >
            <Github size={18} />
          </a>
          <a
            href={project.live}
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme-secondary hover:text-accent-primary transition-colors"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
      <p className="mb-4 text-sm text-theme-secondary line-clamp-2">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {project.tech.slice(0, 4).map((tech: string, i: number) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-full text-xs bg-theme-tertiary text-theme-secondary"
          >
            {tech}
          </span>
        ))}
        {project.tech.length > 4 && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-theme-tertiary text-theme-tertiary">
            +{project.tech.length - 4}
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

export default function RecentWorkSection() {
  const [featuredProjects, setFeaturedProjects] = useState<FeaturedProject[]>(featuredFromResume());
  const [githubProjects, setGithubProjects] = useState<Project[] | null>(null);
  const [openDeepDive, setOpenDeepDive] = useState<{
    title: string;
    website?: string;
    data: ProjectDeepDive | null;
    key?: string;
    projectImages?: string[];
  } | null>(null);
  const [deepDiveTab, setDeepDiveTab] = useState<'overview' | 'images' | 'sources'>('overview');
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);

  async function fetchAndOpenDeepDive(projectTitle: string, key: string, website?: string, projectImages?: string[]) {
    setOpenDeepDive({ title: projectTitle, website, data: null, key, projectImages });
    setDeepDiveTab('overview');
    setDeepDiveLoading(true);
    try {
      const res = await fetch(`/api/projects/research?key=${encodeURIComponent(key)}&refresh=1`);
      if (!res.ok) throw new Error('Failed to load');
      const data: ProjectDeepDive = await res.json();
      setOpenDeepDive((prev) => (prev ? { ...prev, data } : null));
    } catch {
      setOpenDeepDive(null);
    } finally {
      setDeepDiveLoading(false);
    }
  }

  async function regenerateDeepDive() {
    const key = openDeepDive?.key;
    if (!key) return;
    setDeepDiveLoading(true);
    try {
      const res = await fetch(`/api/projects/research?key=${encodeURIComponent(key)}&refresh=1`);
      if (!res.ok) throw new Error('Failed to regenerate');
      const data: ProjectDeepDive = await res.json();
      setOpenDeepDive((prev) => (prev ? { ...prev, data } : null));
    } finally {
      setDeepDiveLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    fetch('/api/projects/featured')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ name: string; description?: string | null; website?: string | null; github?: string | null; imagesPath?: string | null; keywords?: string[] }>) => {
        if (!isMounted || !Array.isArray(data) || data.length === 0) return;
        setFeaturedProjects(
          data.map((p) => ({
            title: p.name,
            description: p.description ?? '',
            images: getProjectImages(p.imagesPath ?? undefined),
            technologies: Array.isArray(p.keywords) ? p.keywords : [],
            liveUrl: p.website ?? undefined,
            githubUrl: p.github ?? undefined,
            imagesPath: p.imagesPath ?? undefined,
          }))
        );
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    getProjects().then((projects) => {
      if (isMounted) setGithubProjects(projects.slice(0, 6));
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="projects" className="py-20 bg-theme-secondary">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 text-theme-primary">
            Projects
          </h2>
          <p className="text-lg text-theme-secondary max-w-2xl mx-auto">
            Production AI systems built with real-time streaming, LLM orchestration, and agentic workflows
          </p>
        </motion.div>

        {/* Featured Projects with Carousels */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-16 items-stretch">
          {featuredProjects.map((project, index) => {
            const deepDiveKey = getDeepDiveKey(project.imagesPath);
            const hasDeepDive = Boolean(deepDiveKey && project.liveUrl);
            return (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="h-full"
              >
                <ProjectCarousel
                  {...project}
                  deepDive={hasDeepDive ? { title: '', body: '' } : null}
                  onOpenDeepDive={
                    hasDeepDive && deepDiveKey
                      ? () => fetchAndOpenDeepDive(project.title, deepDiveKey, project.liveUrl, project.images)
                      : undefined
                  }
                  deepDiveLoading={deepDiveLoading}
                />
              </motion.div>
            );
          })}
        </div>

        {/* More Projects Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h3 className="text-2xl font-bold text-theme-primary">
            More Projects
          </h3>
          <p className="text-theme-secondary mt-2">
            Open source work and experiments
          </p>
        </motion.div>

        {/* GitHub Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {githubProjects === null ? (
            <div className="col-span-full text-center text-lg py-12 text-theme-secondary">
              Loading projects...
            </div>
          ) : (
            githubProjects.map((project: Project, index: number) => (
              <ProjectCard key={project.title} project={project} index={index} />
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {openDeepDive && (
          <DeepDiveModal
            open={openDeepDive}
            tab={deepDiveTab}
            onTabChange={setDeepDiveTab}
            loading={deepDiveLoading}
            onClose={() => setOpenDeepDive(null)}
            onRegenerate={regenerateDeepDive}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
