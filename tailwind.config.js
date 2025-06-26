/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // İDE Okulları Gerçek Kurumsal Renk Paleti
        ide: {
          // Ana mavi tonları (#006EB7)
          primary: {
            50: '#e6f3ff',
            100: '#b3d9ff',
            200: '#80bfff',
            300: '#4da6ff',
            400: '#1a8cff',
            500: '#006EB7',  // Ana mavi
            600: '#005a9a',
            700: '#004a80',
            800: '#003a66',
            900: '#002a4d',
          },
          // Yeşil tonları (#279C38)
          secondary: {
            50: '#e8f5e8',
            100: '#c8e6c9',
            200: '#a5d6a7',
            300: '#81c784',
            400: '#66bb6a',
            500: '#279C38',  // Ana yeşil
            600: '#2e7d32',
            700: '#1b5e20',
            800: '#2e7d32',
            900: '#1b5e20',
          },
          // Kırmızı/Turuncu tonları (#E84D0D)
          accent: {
            50: '#fff3e0',
            100: '#ffe0b2',
            200: '#ffcc80',
            300: '#ffb74d',
            400: '#ffa726',
            500: '#E84D0D',  // Ana kırmızı/turuncu
            600: '#f57c00',
            700: '#ef6c00',
            800: '#e65100',
            900: '#bf360c',
          },
          // Gri tonları (nötr renkler)
          gray: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          }
        },
        // Durum renkleri (IDE renklerini kullanarak)
        success: '#279C38',    // ide-secondary-500
        warning: '#E84D0D',    // ide-accent-500
        error: '#E84D0D',      // ide-accent-500
        info: '#006EB7',       // ide-primary-500
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif'
        ],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'ide': '0 4px 6px -1px rgba(0, 110, 183, 0.1), 0 2px 4px -1px rgba(0, 110, 183, 0.06)',
        'ide-lg': '0 10px 15px -3px rgba(0, 110, 183, 0.1), 0 4px 6px -2px rgba(0, 110, 183, 0.05)',
        'ide-xl': '0 20px 25px -5px rgba(0, 110, 183, 0.1), 0 10px 10px -5px rgba(0, 110, 183, 0.04)',
        'ide-2xl': '0 25px 50px -12px rgba(0, 110, 183, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'ide-gradient': 'ideGradient 3s ease infinite',
        'ide-pulse': 'idePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ideGradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        idePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      backgroundImage: {
        'ide-gradient': 'linear-gradient(135deg, #006EB7, #279C38, #E84D0D)',
        'ide-gradient-primary': 'linear-gradient(135deg, #006EB7, #3B9AE1)',
        'ide-gradient-secondary': 'linear-gradient(135deg, #279C38, #4CAF50)',
        'ide-gradient-accent': 'linear-gradient(135deg, #E84D0D, #FF6F47)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      },
    },
  },
  plugins: [],
};