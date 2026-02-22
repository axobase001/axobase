'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/lib/language-context'
import { Globe, Github, BookOpen, Telescope, Home } from 'lucide-react'

export function Header() {
  const { language, toggleLanguage, t } = useLanguage()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden">
              <Image
                src="/logo.jpg"
                alt="Axobase Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Axobase
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="flex items-center space-x-1 text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>{t('nav.home')}</span>
            </Link>
            <Link 
              href="/observatory" 
              className="flex items-center space-x-1 text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              <Telescope className="w-4 h-4" />
              <span>{t('nav.observatory')}</span>
            </Link>
            <Link 
              href="https://github.com/axobase001/axobase" 
              target="_blank"
              className="flex items-center space-x-1 text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>{t('nav.github')}</span>
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-cyan-500/50 transition-colors"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-zinc-300">
                {language === 'en' ? 'EN' : '中文'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
