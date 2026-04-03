/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: '#000000',
        surface: '#0a0a0a',
        panel: '#111111',
        brand: '#3b82f6',
        success: '#22c55e',
        danger: '#ef4444',
      },
      boxShadow: {
        neon: '0 12px 28px rgba(15, 23, 42, 0.18)',
        pink: '0 12px 28px rgba(15, 23, 42, 0.18)',
        panel: '0 18px 48px rgba(0, 0, 0, 0.42)',
      },
      backgroundImage: {
        'neon-grid':
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -6px, 0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.25', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(1.02)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(24px, -32px, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        glow: 'pulseGlow 6s ease-in-out infinite',
        drift: 'drift 24s linear infinite alternate',
        shimmer: 'shimmer 14s linear infinite',
      },
      fontFamily: {
        display: ['"Trebuchet MS"', '"Segoe UI"', 'sans-serif'],
        body: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
