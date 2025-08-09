'use client'

import React from 'react'
import { motion } from 'motion/react'
import {AudioLines, Banknote, ChartBar, Code, Server, Database } from 'lucide-react'

const AboutSection = () => {
  const features = [
    {
      icon: <Code className="h-8 w-8" />,
      title: "Frontend Development",
      description: "React, Next.js, TypeScript, Tailwind CSS"
    },
    {
      icon: <Server className="h-8 w-8" />,
      title: "Backend Development",
      description: "Node.js, MongoDB, Pinecone DB"
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "DevOps & Cloud",
      description: "AWS, Docker, CI/CD, Monitoring"
    },
    {
      icon: <AudioLines className="h-8 w-8" />,
      title: "Voice AI",
      description: "STS, SAMBA-ASR, Tone Injection"
    },
    {
      icon: <ChartBar className="h-8 w-8" />,
      title: "Data Analysis",
      description: "Jupyter Notebook, Praat, Numpy"
    },
    {
      icon: <Banknote className="h-8 w-8" />,
      title: "Finance",
      description: "Fianancial Modeling, Portfolio Management, Risk Analysis"
    }
  ]

  return (
    <section id="about" className="py-20 relative overflow-hidden bg-theme-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 text-theme-primary">
            About Me
          </h2>
          <p className="text-lg max-w-3xl mx-auto text-theme-secondary">
          Dynamic Voice AI Engineer with 5+ years of experience specializing in real-time voice AI infrastructure and conversational technologies. Expertise encompasses building advanced real-time voice AI systems and developing modular UI components that enhance user interaction. Proficient in leveraging technologies such as Node.js, Typescript, and Python to create efficient, latency-optimized solutions. Known for integrating complex APIs and modernizing analytics pipelines to drive insightful data-driven decisions. A proven track record in delivering innovative voice AI solutions that elevate user experience and operational efficiency.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="glass rounded-2xl p-6 text-center"
            >
              <div className="mb-4 flex justify-center">
                <div className="text-accent-primary">
                  {item.icon}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-theme-primary">
                {item.title}
              </h3>
              <p className="mt-1 text-theme-secondary text-sm">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AboutSection