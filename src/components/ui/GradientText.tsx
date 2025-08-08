import React from 'react'
import { cn } from '@/lib/utils'

interface GradientTextProps {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'tertiary'
  as?: keyof JSX.IntrinsicElements
}

export default function GradientText({ 
  children, 
  className, 
  variant = 'primary',
  as: Component = 'span'
}: GradientTextProps) {
  const gradientClasses = {
    primary: 'gradient-text-primary',
    secondary: 'gradient-text-secondary',
    tertiary: 'gradient-text-tertiary'
  }

  return (
    <Component className={cn(gradientClasses[variant], className)}>
      {children}
    </Component>
  )
} 