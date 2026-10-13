/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Une seule police dans toute l'app (y compris les chiffres, à la place de la police à chasse fixe)
      fontFamily: {
        sans: ['"Exo 2 Variable"', '"Segoe UI"', "system-ui", "sans-serif"],
        mono: ['"Exo 2 Variable"', '"Segoe UI"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
