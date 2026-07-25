/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF5EC",
        wine: "#6E1E2E",
        "wine-dark": "#4E1420",
        gold: "#B3862C",
        "gold-light": "#D9B978",
        ink: "#2B2320",
        blush: "#F1E1D3",
        sage: "#5C6B4F",
      },
      fontFamily: {
        display: ["Marcellus", "serif"],
        body: ["Work Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
}

