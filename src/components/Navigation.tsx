'use client'

import React, { useState } from 'react'
import { Terminal, Menu, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = ['About', 'Skills', 'Projects', 'Resume', 'Contact']

  const handleNavClick = (item: string) => {
    setIsMenuOpen(false)
    // Small delay to allow menu to close before scrolling
    setTimeout(() => {
      document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <nav className="fixed top-0 w-full backdrop-blur-xl z-50 border-b border-theme-primary/30 bg-theme-primary/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button - Left Side */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-theme-primary hover:text-theme-secondary transition-colors p-2 cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Desktop Logo */}
          <div className="hidden md:flex items-center text-theme-primary">
            <Terminal className="h-8 w-8" />
            <span className="ml-2 text-xl font-bold">DevPortfolio</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map((item) => (
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

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-3 pb-4 space-y-2 bg-theme-primary/90 backdrop-blur-lg border-t border-theme-primary/30">
              {navItems.map((item) => (
                <button
                  key={item}
                  onClick={() => handleNavClick(item)}
                  className="block w-full text-left px-4 py-3 rounded-md text-base text-theme-primary font-medium hover:bg-theme-secondary/20 transition-colors cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation