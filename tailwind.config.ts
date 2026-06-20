import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sammly Brand Colors
        primary: {
          50: '#E8F5F3',
          100: '#D1EBE7',
          200: '#A3D7CF',
          300: '#75C3B7',
          400: '#47AF9F',
          500: '#31A895', // Main teal
          600: '#289076',
          700: '#1F6857',
          800: '#163F38',
          900: '#0D2819',
        },
        // Accent red for delete/open/logout
        accent: {
          50: '#FFE8EC',
          100: '#FFD1D9',
          200: '#FFA3B3',
          300: '#FF758D',
          400: '#FF4767',
          500: '#FF5A6E', // Main red
          600: '#E63E52',
          700: '#CC2236',
          800: '#B3061A',
          900: '#99000E',
        },
        // Success green for closed status
        success: {
          50: '#E7FCF3',
          100: '#CFf9E7',
          200: '#A3F3CF',
          300: '#77EDB7',
          400: '#4BE79F',
          500: '#1ECB7F', // Main green
          600: '#18B366',
          700: '#12924D',
          800: '#0C7034',
          900: '#064E1B',
        },
        // Neutral colors
        slate: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0E5FBF 0%, #31A895 100%)',
        'gradient-success': 'linear-gradient(135deg, #1ECB7F 0%, #31A895 100%)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      spacing: {
        sidebar: '237px',
        topbar: '80px',
      },
    },
  },
  plugins: [],
}

export default config
