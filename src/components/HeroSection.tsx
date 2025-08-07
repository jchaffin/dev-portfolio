'use client'

import React from 'react'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import GradientText from '@/components/ui/GradientText'
import GradientButton from '@/components/ui/GradientButton'

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
          <h1 className="text-5xl md:text-7xl font-bold mb-6 pb-2">
            <GradientText as="span" className="block pb-2">
              Fullstack
            </GradientText>
            <GradientText as="span" className="block pb-2">
              Engineer
            </GradientText>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto ">
            Voice AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GradientButton href="#projects" variant="primary">
              View My Work
            </GradientButton>
            <GradientButton href="#contact" variant="outline">
              Get In Touch
            </GradientButton>
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