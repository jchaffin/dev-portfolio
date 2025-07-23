import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Fullstack Developer Portfolio',
  description: 'A showcase of fullstack engineering skills using Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
       <body className={`min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] ${inter.className}`}>{children}</body>
    </html>
  )
}