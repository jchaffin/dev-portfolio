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
    secondary: 'bg-clip-text text-transparent [background-image:var(--color-gradient-secondary)]',
    tertiary: 'bg-clip-text text-transparent [background-image:var(--color-gradient-tertiary)]'
  }

  return (
    <Component className={cn(gradientClasses[variant], className)}>
      {children}
    </Component>
  )
} 