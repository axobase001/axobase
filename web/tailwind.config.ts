import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Axobase Cyberpunk Palette
        'axo-dark': '#0a0a0f',
        'axo-darker': '#050508',
        'axo-panel': '#12121a',
        'axo-border': '#1e1e2e',
        
        // Neon Accents
        'neon-green': '#00ff88',
        'neon-cyan': '#00f0ff',
        'neon-purple': '#b829f7',
        'neon-pink': '#ff0080',
        'neon-yellow': '#f7df1e',
        
        // Functional colors
        'gene-metabolism': '#ff6b35',
        'gene-cognition': '#00f0ff',
        'gene-social': '#b829f7',
        'gene-stress': '#ff0080',
        'gene-regulatory': '#f7df1e',
        
        // Status
        'status-alive': '#00ff88',
        'status-dead': '#ff3333',
        'status-warning': '#f7df1e',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Orbitron', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'dna': 'dna 20s linear infinite',
        'scan': 'scan 3s linear infinite',
        'glitch': 'glitch 1s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00ff88, 0 0 10px #00ff88, 0 0 15px #00ff88' },
          '100%': { boxShadow: '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        dna: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'cyber-grid': 'linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
export default config
