/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e3a8a",    // GHMC Deep Blue
        secondary: "#10b981",  // Green for success/resolved
        background: "#f3f4f6", // Light gray app background
        surface: "#ffffff",
      }
    },
  },
  plugins: [],
}
