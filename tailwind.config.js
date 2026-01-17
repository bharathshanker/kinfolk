/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Quicksand', 'Nunito', 'sans-serif'],
        handwritten: ['Caveat', 'cursive'],
      },
      colors: {
        // Base backgrounds
        cream: '#FFFCF5',
        saffron: '#FFF9ED',
        parchment: '#FFF5E1',

        // Primary - Turmeric/Marigold
        turmeric: {
          50: '#FFFBEB',
          100: '#FFF4D9',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#F9A825',
          600: '#F57F17',
          700: '#E65100',
          800: '#BF360C',
        },

        // Secondary - Deep Plum/Aubergine
        plum: {
          50: '#FDF2F8',
          100: '#F3E5F5',
          200: '#E1BEE7',
          300: '#CE93D8',
          400: '#AB47BC',
          500: '#9C27B0',
          600: '#7B1FA2',
          700: '#6A1B9A',
          800: '#4A148C',
        },

        // Tertiary - Warm Coral/Paprika
        coral: {
          50: '#FFF3E0',
          100: '#FFCCBC',
          200: '#FFAB91',
          300: '#FF8A65',
          400: '#FF7043',
          500: '#FF5722',
          600: '#F4511E',
          700: '#E64A19',
          800: '#D84315',
        },

        // Neutrals - Warm Brown
        brown: {
          50: '#EFEBE9',
          100: '#D7CCC8',
          200: '#BCAAA4',
          300: '#A1887F',
          400: '#8D6E63',
          500: '#795548',
          600: '#6D4C41',
          700: '#5D4037',
          800: '#4E342E',
          900: '#3E2723',
        },

        // Keep some legacy colors for compatibility
        sage: {
          50: '#F4F7F4',
          100: '#E3EBE3',
          200: '#C5D6C5',
          500: '#7A9E7A',
          700: '#4F6F4F',
        },
        peach: {
          50: '#FFF8F5',
          100: '#FFE8E0',
          200: '#FFD1C1',
          500: '#FF9E80',
        },
        warm: {
          50: '#FAF9F6',
          100: '#F5F2EA',
          200: '#E6DECE',
          800: '#5C5446',
        },
      },
      boxShadow: {
        'warm-sm': '0 1px 2px rgba(78, 52, 46, 0.06), 0 1px 3px rgba(78, 52, 46, 0.08)',
        'warm': '0 2px 4px rgba(78, 52, 46, 0.06), 0 4px 8px rgba(78, 52, 46, 0.08)',
        'warm-md': '0 4px 6px rgba(78, 52, 46, 0.07), 0 8px 16px rgba(78, 52, 46, 0.07)',
        'warm-lg': '0 8px 16px rgba(78, 52, 46, 0.08), 0 16px 32px rgba(78, 52, 46, 0.08)',
        'warm-xl': '0 16px 32px rgba(78, 52, 46, 0.1), 0 32px 64px rgba(78, 52, 46, 0.1)',
        'glow-turmeric': '0 0 20px rgba(249, 168, 37, 0.3)',
        'glow-plum': '0 0 20px rgba(156, 39, 176, 0.25)',
        'glow-coral': '0 0 20px rgba(255, 112, 67, 0.3)',
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(180deg, #FFFCF5 0%, #FFF9ED 50%, #FFF5E1 100%)',
        'gradient-spice': 'linear-gradient(135deg, #F9A825 0%, #FF7043 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #FFCA28 0%, #FF8A65 50%, #AB47BC 100%)',
        'gradient-plum': 'linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)',
        'gradient-card-health': 'linear-gradient(135deg, #FDF2F8 0%, #F3E5F5 100%)',
        'gradient-card-todo': 'linear-gradient(135deg, #FFFBEB 0%, #FFF4D9 100%)',
        'gradient-card-notes': 'linear-gradient(135deg, #FFF9ED 0%, #FFF5E1 100%)',
        'gradient-card-finance': 'linear-gradient(135deg, #FFF3E0 0%, #FFCCBC 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(249, 168, 37, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(249, 168, 37, 0.4)' },
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
}
