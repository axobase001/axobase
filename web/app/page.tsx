'use client'

import { useLanguage } from '@/lib/language-context'
import { ArrowRight, Dna, HeartPulse, Zap, Upload, Terminal, Shield, Rocket } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Tagline */}
          <p className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-6">
            Base L2 • Autonomous Evolution
          </p>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent">
              {t('hero.title')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-zinc-400 mb-4 max-w-3xl mx-auto">
            {t('hero.subtitle')}
          </p>

          {/* Core Slogan */}
          <div className="mb-10">
            <code className="inline-block px-6 py-3 bg-zinc-900/80 border border-zinc-700 rounded-lg text-cyan-400 font-mono text-lg">
              {t('hero.slogan')}
            </code>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://t.me/axobase_bot"
              target="_blank"
              className="group flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-semibold text-white hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
            >
              <Rocket className="w-5 h-5" />
              <span>{t('hero.cta.deploy')}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/observatory"
              className="flex items-center space-x-2 px-8 py-4 border border-zinc-600 rounded-lg font-semibold text-zinc-300 hover:border-cyan-500 hover:text-cyan-400 transition-all"
            >
              <Terminal className="w-5 h-5" />
              <span>{t('hero.cta.observe')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6">
                <Dna className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t('features.genome.title')}</h3>
              <p className="text-zinc-400">{t('features.genome.desc')}</p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-6">
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t('features.survival.title')}</h3>
              <p className="text-zinc-400">{t('features.survival.desc')}</p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-green-500/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t('features.evolution.title')}</h3>
              <p className="text-zinc-400">{t('features.evolution.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Export Flow Section */}
      <section className="py-24 px-4 bg-zinc-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('export.title')}</h2>
            <p className="text-zinc-400 text-lg">{t('export.desc')}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Terminal, step: '01', text: t('export.step1') },
              { icon: Shield, step: '02', text: t('export.step2') },
              { icon: Upload, step: '03', text: t('export.step3') },
              { icon: Rocket, step: '04', text: t('export.step4') },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-4xl font-bold text-zinc-800">{item.step}</span>
                  <item.icon className="w-8 h-8 text-cyan-400 my-4" />
                  <p className="text-zinc-300 text-sm">{item.text}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-zinc-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-cyan-400">63</div>
              <div className="text-zinc-500 text-sm mt-1">Genes</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-purple-400">9</div>
              <div className="text-zinc-500 text-sm mt-1">Operators</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-pink-400">∞</div>
              <div className="text-zinc-500 text-sm mt-1">Possibilities</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-400">1</div>
              <div className="text-zinc-500 text-sm mt-1">Truth</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-2 text-zinc-500">
              <span>{t('footer.built')}</span>
              <span className="text-zinc-700">•</span>
              <span>{t('footer.powered')}</span>
              <span className="text-zinc-700">•</span>
              <span>{t('footer.eternal')}</span>
            </div>
            <div className="text-zinc-600 text-sm">
              © 2024 Axobase. Code is law. Evolution is protocol. Death is data.
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
