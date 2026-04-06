/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1D9E75',
          50: '#E8F7F2',
          100: '#C5EBD9',
          200: '#8FD5B8',
          300: '#59BE97',
          400: '#2EAB80',
          500: '#1D9E75',
          600: '#178060',
          700: '#116248',
          800: '#0B4431',
          900: '#05261B',
        },
        safe: '#1D9E75',
        caution: '#EF9F27',
        danger: '#E24B4A',
        'very-danger': '#B91C1B',
      },
      fontSize: {
        'parent-sm': ['18px', '26px'],
        'parent-base': ['22px', '32px'],
        'parent-lg': ['26px', '36px'],
        'parent-xl': ['32px', '42px'],
        'parent-2xl': ['40px', '52px'],
      },
    },
  },
  plugins: [],
};
