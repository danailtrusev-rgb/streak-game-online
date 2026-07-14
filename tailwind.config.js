/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '2px',
      md: '2px',
      lg: '2px',
      xl: '2px',
      '2xl': '2px',
      '3xl': '2px',
      full: '9999px',
    },
    extend: {
      colors: {
        ritual: {
          bg: '#0B0F0C',
          surface: '#111915',
          elevated: '#182019',
        },
        moss: {
          dark: '#1E2D24',
          mid: '#2A3F30',
          light: '#3A5542',
        },
        torch: {
          orange: '#FF7A00',
          ember: '#FFB347',
          dim: '#CC6200',
        },
        bone: {
          DEFAULT: '#E8E2DA',
          muted: '#C8C0B5',
          faint: '#A8A098',
          dark: '#FFFFFF',
        },
        death: {
          red: '#7A0F0F',
          glow: '#A52020',
          dim: '#4A0909',
        },
        gold: {
          300: '#F5D060',
          400: '#D4A020',
          500: '#B08018',
        },
      },
      fontFamily: {
        title: ['"Metal Mania"', 'Cinzel', 'Georgia', 'serif'],
        heading: ['Lora', 'Cinzel', 'Georgia', 'serif'],
        subheading: ['Cinzel', 'Georgia', 'serif'],
        body: ['Lora', 'Inter', 'system-ui', 'sans-serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'torch': '0 0 40px rgba(255,122,0,0.25), 0 0 80px rgba(255,122,0,0.1)',
        'torch-intense': '0 0 50px rgba(255,122,0,0.4), 0 0 100px rgba(255,122,0,0.2)',
        'torch-btn': '0 0 20px rgba(255,122,0,0.35), 0 0 60px rgba(255,122,0,0.12)',
        'torch-btn-hover': '0 0 30px rgba(255,122,0,0.5), 0 0 80px rgba(255,122,0,0.2)',
        'death': '0 0 40px rgba(122,15,15,0.3), 0 0 80px rgba(122,15,15,0.15)',
        'gold-glow': '0 0 20px rgba(245,208,96,0.2), 0 0 60px rgba(245,208,96,0.08)',
      },
      animation: {
        'torch-pulse': 'torchPulse 3s ease-in-out infinite',
        'torch-flicker': 'torchFlicker 4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'fade-in-slow': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'skull-idle': 'skullIdle 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        torchPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        torchFlicker: {
          '0%, 100%': { opacity: '0.8' },
          '20%': { opacity: '0.6' },
          '40%': { opacity: '0.9' },
          '60%': { opacity: '0.7' },
          '80%': { opacity: '0.85' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        skullIdle: {
          '0%, 100%': { transform: 'translateY(0)', filter: 'brightness(1)' },
          '50%': { transform: 'translateY(-4px)', filter: 'brightness(1.1)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
      },
    },
  },
  plugins: [],
};
