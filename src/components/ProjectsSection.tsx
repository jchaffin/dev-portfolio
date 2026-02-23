'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Github, ExternalLink } from 'lucide-react'
import { getProjects, Project } from '@/lib/getProjects'

export default function ProjectsSection() {
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    getProjects().then((repos) => {
      if (isMounted) setProjects(repos.slice(0, 6));
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <section id="projects" className="py-20 bg-theme-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 text-theme-primary">
            Featured Projects
          </h2>
          <p className="text-theme-secondary">
            A showcase of my recent work and contributions
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects === null ? (
            <div className="col-span-full text-center text-lg py-12 text-theme-secondary">Loading projects...</div>
          ) : (
            projects.map((project: Project, index: number) => (
              <ProjectCard key={project.title} project={project} index={index} />
            ))
          )}
        </div>
      </div>
    </section>
  )
}

const ProjectCard = ({ project, index }: { project: Project, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="glass rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
  >
    {project.image && (
      <a
        href={project.live || project.github}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative h-48 overflow-hidden bg-theme-tertiary"
      >
        <img
          src={project.image}
          alt={`${project.title} preview`}
          className="w-full h-full object-cover object-top transition-transform duration-300 hover:scale-105"
        />
        {project.featured && (
          <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/90 text-white backdrop-blur-sm">
            Featured
          </span>
        )}
      </a>
    )}

    <div className="p-4 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-theme-primary">
          {project.title}
        </h3>
        <div className="flex space-x-2">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-secondary hover:text-blue-600 transition-colors"
            >
              <Github size={20} />
            </a>
          )}
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-secondary hover:text-blue-600 transition-colors"
            >
              <ExternalLink size={20} />
            </a>
          )}
        </div>
      </div>
      <p className="mb-4 text-theme-secondary flex-1">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-2">
        {project.tech.map((tech: string, i: number) => (
          <span
            key={i}
            className="px-3 py-1 rounded-full text-sm bg-theme-tertiary text-theme-secondary"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  </motion.div>
)
