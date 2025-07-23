'use client'

import React from 'react'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'

const HeroSection = () => {
  return (
    <section id="hero" className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 [background-image:var(--color-gradient-secondary)]" />
      <div className="relative z-10 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent [background-image:var(--color-gradient-primary)] pb-2">
            Fullstack
            <span className="block pb-2">AI Engineer</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto ">
            Building scalable web applications with modern technologies and best practices
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a
              href="#projects"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-lg font-semibold transition-all duration-300 "
            >
              View My Work
            </motion.a>
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="border-2 border-solid px-8 py-3 font-semibold transition-all duration-300 border-gradient-primary hover:text-white"
            >
              Get In Touch
            </motion.a>
          </div>
        </motion.div>
      </div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
      >
        <ChevronDown className="h-8 w-8" />
      </motion.div>
    </section>
  )
}

export default HeroSection