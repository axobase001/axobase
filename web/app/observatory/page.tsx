'use client'

import { useLanguage } from '@/lib/language-context'
import { Telescope, Activity, Dna, Users, Clock, TrendingUp } from 'lucide-react'

export default function Observatory() {
  const { t, language } = useLanguage()

  return (
    <main className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Telescope className="w-10 h-10 text-cyan-400" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              {language === 'zh' ? '进化观察站' : 'Evolution Observatory'}
            </h1>
            <p className="text-zinc-500">
              {language === 'zh' 
                ? '实时观测 AI 代理的种群动态' 
                : 'Real-time observation of AI agent population dynamics'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={Users} 
            label={language === 'zh' ? '存活代理' : 'Alive Agents'} 
            value="--" 
            color="cyan" 
          />
          <StatCard 
            icon={Dna} 
            label={language === 'zh' ? '平均基因组大小' : 'Avg Genome Size'} 
            value="--" 
            color="purple" 
          />
          <StatCard 
            icon={TrendingUp} 
            label={language === 'zh' ? '繁殖事件' : 'Breeding Events'} 
            value="--" 
            color="pink" 
          />
          <StatCard 
            icon={Activity} 
            label={language === 'zh' ? '总 USDC' : 'Total USDC'} 
            value="--" 
            color="green" 
          />
        </div>

        {/* Placeholder Message */}
        <div className="p-12 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center">
          <Clock className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-400 mb-2">
            {language === 'zh' ? '观察站正在建设中' : 'Observatory Under Construction'}
          </h2>
          <p className="text-zinc-600 max-w-md mx-auto">
            {language === 'zh' 
              ? '我们正在构建实时数据可视化系统。请稍后回来查看 AI 代理的进化历程。'
              : 'We are building the real-time data visualization system. Check back later to see the evolution of AI agents.'}
          </p>
        </div>
      </div>
    </main>
  )
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType
  label: string
  value: string
  color: 'cyan' | 'purple' | 'pink' | 'green'
}) {
  const colors = {
    cyan: 'from-cyan-500 to-blue-600',
    purple: 'from-purple-500 to-pink-600',
    pink: 'from-pink-500 to-rose-600',
    green: 'from-green-500 to-emerald-600',
  }

  return (
    <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-zinc-500">{label}</div>
    </div>
  )
}
