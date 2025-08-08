// Tailwind does not export PluginAPI or PluginUtils types directly.
// Use 'any' for plugin argument if you want type safety, or define your own type.
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'border-primary': 'var(--border-primary)',
        'border-secondary': 'var(--border-secondary)',
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-success': 'var(--accent-success)',
        'accent-warning': 'var(--accent-warning)',
        'accent-error': 'var(--accent-error)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-tertiary': 'var(--gradient-tertiary)',
        'gradient-purple-blue': 'var(--gradient-purple-blue)',
        'gradient-glass': 'var(--gradient-glass)',
      },
    },
  },
  plugins: [
    // Custom plugin for theme utilities
    function({ addUtilities, theme }: any) {
      const newUtilities = {
        '.text-theme-primary': {
          color: theme('colors.text-primary'),
        },
        '.text-theme-secondary': {
          color: theme('colors.text-secondary'),
        },
        '.text-theme-tertiary': {
          color: theme('colors.text-tertiary'),
        },
        '.bg-theme-primary': {
          backgroundColor: theme('colors.bg-primary'),
        },
        '.bg-theme-secondary': {
          backgroundColor: theme('colors.bg-secondary'),
        },
        '.bg-theme-tertiary': {
          backgroundColor: theme('colors.bg-tertiary'),
        },
        '.bg-gradient-theme-primary': {
          backgroundImage: theme('backgroundImage.gradient-primary'),
        },
        '.bg-gradient-theme-secondary': {
          backgroundImage: theme('backgroundImage.gradient-secondary'),
        },
        '.bg-gradient-theme-tertiary': {
          backgroundImage: theme('backgroundImage.gradient-tertiary'),
        },
      }
      addUtilities(newUtilities)
    }
  ],
}

export default config
