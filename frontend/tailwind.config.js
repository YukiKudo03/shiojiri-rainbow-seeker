/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        rainbow: {
          red: '#ff0000',
          orange: '#ff7f00',
          yellow: '#ffff00',
          green: '#00ff00',
          blue: '#0000ff',
          indigo: '#4b0082',
          violet: '#9400d3',
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}