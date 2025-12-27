/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
      colors: {
        cream: '#FDFBF7',
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
        }
      }
    },
  },
  plugins: [],
}
