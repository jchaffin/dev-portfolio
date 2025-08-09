'use client'

import React from 'react'

const HeroSection = () => {
  return (
    <section id="hero" className="min-h-screen flex items-center justify-center text-theme-primary bg-gradient-primary">
      <div className="text-center px-4">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
           Fullstack Engineer
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-theme-secondary">
          Voice AI
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#projects" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            View My Work
          </a>
          <a href="#contact" className="border border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            Get In Touch
          </a>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
