'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink, Github, FileText, Layers } from 'lucide-react';
import Image from 'next/image';
import { getProjects, Project } from '@/lib/getProjects';
import resumeData from '@/data/resume.json';
import { PROJECT_DEEP_DIVES, getDeepDiveKey, ProjectDeepDive } from '@/data/projectDeepDives';

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
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex((i) => (i + 1) % images.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-700">
      {/* Image Carousel */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden shrink-0">
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
              src={images[currentIndex]}
              alt={`${title} screenshot ${currentIndex + 1}`}
              fill
              sizes="(max-width: 1280px) 50vw, 25vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {images.length > 1 && (
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
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
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
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white break-words min-w-0">{title}</h3>
          <div className="flex gap-2 shrink-0">
            {deepDive && onOpenDeepDive && (
              <button
                type="button"
                onClick={onOpenDeepDive}
                className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
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
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
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

        <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed line-clamp-6 text-base lg:text-lg min-h-0">
          {description}
        </p>

        <div className="flex flex-wrap gap-2 mt-auto">
          {technologies.map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 text-sm lg:text-base rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
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

const FEATURED_PROJECTS = (resumeData as any).projects.map((proj: any) => ({
  title: proj.name,
  description: proj.description,
  images: getProjectImages(proj.images),
  technologies: proj.keywords || [],
  liveUrl: proj.website,
  githubUrl: proj.github,
  imagesPath: proj.images,
}));

const ProjectCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow duration-300"
  >
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {project.title}
        </h3>
        <div className="flex space-x-2">
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Github size={18} />
          </a>
          <a
            href={project.live}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {project.tech.slice(0, 4).map((tech: string, i: number) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            {tech}
          </span>
        ))}
        {project.tech.length > 4 && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-500">
            +{project.tech.length - 4}
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

export default function RecentWorkSection() {
  const [githubProjects, setGithubProjects] = useState<Project[] | null>(null);
  const [openDeepDive, setOpenDeepDive] = useState<{ title: string; data: ProjectDeepDive } | null>(null);

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
    <section id="projects" className="py-20 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white">
            Projects
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Production AI systems built with real-time streaming, LLM orchestration, and agentic workflows
          </p>
        </motion.div>

        {/* Featured Projects with Carousels */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-16 items-stretch">
          {FEATURED_PROJECTS.map((project, index) => {
            const deepDiveKey = getDeepDiveKey(project.imagesPath);
            const deepDive = deepDiveKey ? PROJECT_DEEP_DIVES[deepDiveKey] ?? null : null;
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
                  deepDive={deepDive}
                  onOpenDeepDive={
                    deepDive
                      ? () => setOpenDeepDive({ title: project.title, data: deepDive })
                      : undefined
                  }
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
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            More Projects
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Open source work and experiments
          </p>
        </motion.div>

        {/* GitHub Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {githubProjects === null ? (
            <div className="col-span-full text-center text-lg py-12 text-slate-500">
              Loading projects...
            </div>
          ) : (
            githubProjects.map((project: Project, index: number) => (
              <ProjectCard key={project.title} project={project} index={index} />
            ))
          )}
        </div>
      </div>

      {/* Deep Dive Modal */}
      <AnimatePresence>
        {openDeepDive && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenDeepDive(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {openDeepDive.title} — {openDeepDive.data.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenDeepDive(null)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {openDeepDive.data.body}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
