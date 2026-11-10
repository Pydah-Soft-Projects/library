/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
        },
        surface: 'var(--surface)',
        background: 'var(--background)',
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          text: 'var(--sidebar-text)',
          muted: 'var(--sidebar-muted)',
        },
        navbar: 'var(--navbar)',
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        'text-main': 'var(--text-primary)',
        'text-sub': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        brand: {
          navy: '#0B1F3A',
          primary: '#2563EB',
          'primary-hover': '#1D4ED8',
          subtle: '#EFF6FF',
          accent: '#06B6D4'
        }
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
