/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', '"Neue Haas Grotesk"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        ui: ['Manrope', '"Neue Haas Grotesk"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        code: ['"JetBrains Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
        clash: ['"Clash Display"', 'sans-serif'],
      },
      colors: {
        brand: '#7132f5',
        'brand-deep': '#2a0c70',
        'brand-soft': '#a887ff',
        ink: '#070d19',
        panel: '#f0f2f7',
        'near-black': '#101114',
        'silver-blue': '#9497a9',
        'brand-green': '#149e61',
      },
      boxShadow: {
        whisper: '0px 4px 24px rgba(0,0,0,0.03)',
        glow: '0 0 80px rgba(113, 50, 245, 0.28)',
      },
    },
  },
  plugins: [],
}
