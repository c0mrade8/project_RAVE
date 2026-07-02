/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0b0f',
        bg2: '#111318',
        bg3: '#181b22',
        bg4: '#1e2230',
        bg5: '#252a38',
        accent: '#6c63ff',
        accent2: '#8b84ff',
        green: '#22c98a',
        amber: '#f5a623',
        red: '#ff5c5c',
        teal: '#00d4c8',
        purple: '#b983ff',
        muted: '#8b909e',
        faint: '#555c6e',
      },
      fontFamily: {
        sans: ['-apple-system', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
        'spin-slow': 'spin 0.8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}