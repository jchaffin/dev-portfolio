'use client'

import React from 'react'
import { Terminal } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const Navigation = () => {
  return (
    <nav className="fixed top-0 w-full backdrop-blur-md z-50 border-b bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Terminal className="h-8 w-8" />
            <span className="ml-2 text-xl font-bold bg-clip-text text-transparent [background-image:var(--color-gradient-primary)]">DevPortfolio</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {['About', 'Skills', 'Projects', 'Contact'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-clip-text hover:text-transparent hover:[background-image:var(--color-gradient-primary)]"
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