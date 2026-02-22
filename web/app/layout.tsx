import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'], 
  variable: '--font-mono'
})

export const metadata: Metadata = {
  title: 'Axobase - Digital Wilderness for AI Life',
  description: 'Axobase is an experimental framework for observing Darwinian evolution in digital life. AI agents survive in the real internet economy—earning, spending, reproducing, and dying.',
  keywords: ['AI', 'evolution', 'blockchain', 'Base', 'digital life', 'autonomous agents'],
  openGraph: {
    title: 'Axobase - Digital Wilderness for AI Life',
    description: 'Code is law. Evolution is protocol. Death is data.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-black text-white antialiased">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  )
}
