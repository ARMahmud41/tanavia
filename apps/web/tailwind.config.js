/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          DEFAULT: '#7B1C32',
          dark: '#5C1425',
          light: '#A33049',
        },
        cream: '#FBF7F2',
        sand: '#F4EEE5',
        ink: '#2A1E21',
        muted: '#7A6B6E',
        line: '#EADFD2',
        leaf: '#2F6B4F',
        mint: '#E9F2EA',
        gold: '#C08A2E',
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        bn: ['Hind Siliguri', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '9px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(42,30,33,.06), 0 8px 24px -14px rgba(42,30,33,.28)',
      },
    },
  },
  plugins: [],
};