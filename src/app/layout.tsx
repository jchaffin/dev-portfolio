import './globals.css'
import '@/lib/envSetup'
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata = {
  title: 'Fullstack AI Engineer',
  description: 'Jacob Chaffin - Software Engineer | Voice AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
       <body className={`min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] ${inter.variable} font-sans`}>{children}</body>
    </html>
  )
}