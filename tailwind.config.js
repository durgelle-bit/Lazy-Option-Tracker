/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vault: {
          950: '#05070a',
          900: '#0b0f16',
          850: '#0f141d',
          800: '#141a24',
          750: '#181f2b',
          700: '#1e2632',
          600: '#2a3442',
          500: '#3b4759',
          400: '#5c6b80',
        },
        profit: {
          DEFAULT: '#22c55e',
          soft: '#16a34a',
          glow: '#4ade80',
        },
        loss: {
          DEFAULT: '#ef4444',
          soft: '#dc2626',
          glow: '#f87171',
        },
        accent: {
          DEFAULT: '#38bdf8',
          soft: '#0ea5e9',
          glow: '#7dd3fc',
        },
        gold: {
          DEFAULT: '#eab308',
          soft: '#ca8a04',
          glow: '#fde047',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 20px -2px rgba(34, 197, 94, 0.35)',
        'glow-red': '0 0 20px -2px rgba(239, 68, 68, 0.35)',
        'glow-blue': '0 0 20px -2px rgba(56, 189, 248, 0.35)',
        'card': '0 4px 24px -4px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
