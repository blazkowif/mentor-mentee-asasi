/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // UMS brand palette — adjust exact hex to official UMS brand guide
        'ums-blue': {
          DEFAULT: '#003366',
          light: '#1a5c9e',
          dark: '#001f3f',
        },
        'ums-gray': {
          light: '#f5f6f8',
          DEFAULT: '#e2e5e9',
          dark: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
