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
      <body className={`min-h-screen ${inter.variable} font-sans`} style={{
        background: 'linear-gradient(to bottom right, #DDEEFF, #F7F8F9)'
      }}>
        <div className="dark:hidden absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0E0B16 0%, #1B1A2E 50%, #10272F 100%)'
        }}></div>
        <div className="hidden dark:block absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0E0B16 0%, #1B1A2E 50%, #10272F 100%)'
        }}></div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  )
}