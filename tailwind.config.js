/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'soliden': ['Soliden Regular', 'sans-serif'],
        'soliden-condensed': ['Soliden Condensed', 'sans-serif'],
        'monoline': ['Monoline', 'sans-serif'],
      },
    },
  },
  plugins: [],
}