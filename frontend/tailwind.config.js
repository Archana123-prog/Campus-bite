/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // saffron: the canteen signboard colour
        brand: {
          50: '#FFF8EB', 100: '#FFEDC7', 200: '#FEDB8F', 300: '#FDC456', 400: '#FBAD2B',
          500: '#F59A0B', 600: '#D97B06', 700: '#B35C09', 800: '#8F480E', 900: '#763D0F',
        },
        // ink: deep blue-black used for text and dark surfaces
        ink: {
          50: '#F4F5F8', 100: '#E6E8EF', 200: '#CDD1DE', 300: '#A3AABF', 400: '#7A839C',
          500: '#5B647D', 600: '#454C61', 700: '#2D3345', 800: '#1B2030', 900: '#11141F', 950: '#0B0D15',
        },
        chili: { 500: '#E4572E', 600: '#C9441F' },
        leaf: { 500: '#2E9E5B', 600: '#228048' },
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.8)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        slideIn: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        ping2: { '0%': { transform: 'scale(1)', opacity: 0.6 }, '100%': { transform: 'scale(2.2)', opacity: 0 } },
      },
      animation: {
        pop: 'pop .18s ease-out',
        slideIn: 'slideIn .25s ease-out',
        ping2: 'ping2 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
