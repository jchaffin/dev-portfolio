'use client'

import React from 'react'
import { Terminal } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const Navigation = () => {
  return (
    <nav className="fixed top-0 w-full backdrop-blur-xl z-50 border-b border-theme-primary/30 bg-theme-primary/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center text-theme-primary">
            <Terminal className="h-8 w-8" />
            <span className="ml-2 text-xl font-bold">DevPortfolio</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {['About', 'Skills', 'Projects', 'Resume', 'Contact'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="px-3 py-2 rounded-md text-sm text-theme-primary font-medium transition-colors nav-link"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation