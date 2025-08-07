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
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--color-gradient-primary)',
        'gradient-secondary': 'var(--color-gradient-secondary)',
        'gradient-tertiary': 'var(--color-gradient-tertiary)',
      },
    },
  },
  plugins: [],
}
