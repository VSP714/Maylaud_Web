/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',           /* Royal Amethyst #5E35B1 */
        secondary: 'var(--secondary-color)',       /* Deep Indigo #2D1657 */
        background: 'var(--background-color)',     /* Pearl White #FDFCFE */
        text: 'var(--text-color)',                 /* Deep Indigo #2D1657 */
        card: 'var(--card-color)',                 /* Pearl White #FDFCFE */
        border: 'var(--border-color)',             /* Cool Grey-Purple #9E97B2 */
        accent: 'var(--accent-color)',             /* Lavender Mist #E8E2F7 */
        error: 'var(--error-color)',               /* Soft Rose #F8E7EF */
      },
    },
  },
  plugins: [],
}

