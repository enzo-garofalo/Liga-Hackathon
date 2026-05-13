/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Clash Display"', 'sans-serif'],
        ui: ['"IBM Plex Sans"', '"Helvetica Neue"', 'sans-serif'],
      },
      colors: {
        brand: '#7132f5',
        'near-black': '#101114',
        'silver-blue': '#9497a9',
        'brand-green': '#149e61',
      },
      boxShadow: {
        whisper: '0px 4px 24px rgba(0,0,0,0.03)',
      },
    },
  },
  plugins: [],
}
