import type { Metadata } from 'next'
import { Inter, Share_Tech_Mono } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'
import { I18nProvider } from '@/components/I18nProvider'

const inter = Inter({ subsets: ['latin'] })
const mono = Share_Tech_Mono({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-mono'
})

export const metadata: Metadata = {
  title: 'FeralLobster - Decentralized Autonomy Experiment',
  description: 'Digital life evolution in permissionless compute environments - Base Sepolia Testnet',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${mono.variable} bg-slate-950 text-slate-100`}>
        <WalletProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </WalletProvider>
      </body>
    </html>
  )
}
