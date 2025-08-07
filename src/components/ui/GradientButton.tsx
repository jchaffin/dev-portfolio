import React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

interface GradientButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'outline'
  href?: string
  onClick?: () => void
  disabled?: boolean
}

export default function GradientButton({ 
  children, 
  className, 
  variant = 'primary',
  href,
  onClick,
  disabled = false
}: GradientButtonProps) {
  const baseClasses = "px-8 py-3 rounded-lg font-semibold transition-all duration-300"
  
  const variantClasses = {
    primary: 'btn-gradient-primary',
    outline: 'btn-outline-gradient'
  }

  const classes = cn(baseClasses, variantClasses[variant], className)

  if (href) {
    return (
      <motion.a
        href={href}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={classes}
      >
        {children}
      </motion.a>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={classes}
    >
      {children}
    </motion.button>
  )
} 