import './globals.css'
import '@/lib/envConfig'
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata = {
  title: 'Portfolio',
  description: 'Fullstack Engineer | Voice AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen ${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}