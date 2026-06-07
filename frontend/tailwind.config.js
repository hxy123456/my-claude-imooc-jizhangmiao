/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        sand: '#F5EDE3',
        warm: '#E8DDD0',
        bark: '#5C4A3A',
        clay: '#8B7355',
        coral: '#E8654A',
        mint: '#3DB88C',
        peach: '#F4A261',
        honey: '#E9C46A',
        blush: '#F2D7D5',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
