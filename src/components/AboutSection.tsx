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
      description: "Node.js, Express, PostgreSQL, APIs"
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "DevOps & Cloud",
      description: "AWS, Docker, CI/CD, Monitoring"
    },
    {
      icon: <AudioLines className="h-8 w-8" />,
      title: "Voice AI",
      description: "OpenAI realtime, ASR, emotion detection, and more"
    },
    {
      icon: <ChartBar className="h-8 w-8" />,
      title: "Data Analysis",
      description: "Python, Pandas, NumPy, Matplotlib"
    },
    {
      icon: <Banknote className="h-8 w-8" />,
      title: "Finance",
      description: "Financial Modeling, Portfolio Management, Risk Analysis"
    }
  ]

  return (
    <section id="about" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent [background-image:var(--color-gradient-primary)]">
            About Me
          </h2>
          <p className="text-lg max-w-3xl mx-auto ">
          Dynamic Fullstack Engineer with 5+ years of experience specializing in Voice AI and conversational technologies. Expertise encompasses nbuilding advanced real-time voice AI infrastructures and developing modular UI components that enhance user interaction. Proficient in leveraging technologies such as Node.js, Typescript, and Python to create efficient, latency-optimized solutions. Known for integrating complex APIs and modernizing analytics pipelines to drive insightful data-driven decisions. A proven track record in delivering innovative software solutions that elevate user experience and operational efficiency.
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
              className="text-center p-6 rounded-lg"
            >
              <div className="mb-4 flex justify-center">
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 ">
                {item.title}
              </h3>
              <p className="">
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