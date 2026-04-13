/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#00b890",
        "primary-dark": "#009678",
        secondary: "#6366f1",
        surface: "#ffffff",
        "surface-hover": "#f8fafc",
        border: "#e2e8f0",
        "text-primary": "#0f172a",
        "text-secondary": "#64748b",
        sidebar: "#ffffff",
        main: "#f8fafc",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [],
};
