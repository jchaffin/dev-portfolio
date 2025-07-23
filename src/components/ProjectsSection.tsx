'use client'

import React from 'react'
import { motion } from 'motion/react'
import { Github, ExternalLink } from 'lucide-react'

interface Project {
  title: string
  description: string
  tech: string[]
  github: string
  live: string
  featured: boolean
}

const projects: Project[] = [
  {
    title: 'E-commerce Platform',
    description: 'Full-stack e-commerce solution with payment integration, inventory management, and admin dashboard.',
    tech: ['Next.js', 'Prisma', 'PostgreSQL', 'Stripe', 'Tailwind'],
    github: 'https://github.com/yourusername/ecommerce',
    live: 'https://ecommerce-demo.vercel.app',
    featured: true
  },
  {
    title: 'Real-time Chat Application',
    description: 'WebSocket-based chat app with rooms, file sharing, and message encryption.',
    tech: ['React', 'Socket.io', 'Express', 'MongoDB', 'JWT'],
    github: 'https://github.com/yourusername/chat-app',
    live: 'https://chat-app-demo.vercel.app',
    featured: true
  },
  {
    title: 'Task Management API',
    description: 'RESTful API with authentication, CRUD operations, and comprehensive testing.',
    tech: ['Node.js', 'Express', 'PostgreSQL', 'Jest', 'Swagger'],
    github: 'https://github.com/yourusername/task-api',
    live: 'https://task-api-docs.vercel.app',
    featured: false
  },
  {
    title: 'Weather Dashboard',
    description: 'Dynamic weather app with location services, forecasts, and data visualization.',
    tech: ['React', 'Chart.js', 'OpenWeather API', 'Geolocation'],
    github: 'https://github.com/yourusername/weather-dashboard',
    live: 'https://weather-dashboard-demo.vercel.app',
    featured: false
  }
]

const ProjectCard = ({ project, index }: { project: Project, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className={`rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 bg-[var(--color-bg-secondary)] ${
      project.featured ? 'md:col-span-2' : ''
    }`}
  >
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold ">
          {project.title}
        </h3>
        <div className="flex space-x-2">
          <a 
            href={project.github} 
            target="_blank" 
            rel="noopener noreferrer"
            className=""
          >
            <Github size={20} />
          </a>
          <a 
            href={project.live} 
            target="_blank" 
            rel="noopener noreferrer"
            className=""
          >
            <ExternalLink size={20} />
          </a>
        </div>
      </div>
      <p className="mb-4 ">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-2">
        {project.tech.map((tech, i) => (
          <span 
            key={i}
            className="px-3 py-1 rounded-full text-sm "
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  </motion.div>
)

const ProjectsSection = () => {
  return (
    <section id="projects" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent [background-image:var(--color-gradient-primary)]">
            Featured Projects
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            A showcase of my recent work and contributions
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProjectsSection