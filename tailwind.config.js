/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(214, 32%, 91%)",
        input: "hsl(214, 32%, 91%)",
        ring: "hsl(215, 20.2%, 65.1%)",
        background: "#ffffff",
        foreground: "#0b0f19",
        primary: {
          DEFAULT: "#0ea5e9",
          foreground: "#ffffff"
        },
        muted: {
          DEFAULT: "hsl(210, 40%, 96.1%)",
          foreground: "hsl(215, 16.3%, 46.9%)",
        },
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
    },
  },
  plugins: [],
}

