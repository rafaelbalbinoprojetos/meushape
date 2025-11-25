/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        body: ['"Inter"', "system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        temaSky: {
          DEFAULT: "rgb(var(--color-accent-primary) / <alpha-value>)",
          light: "rgb(var(--color-accent-light) / <alpha-value>)",
          dark: "rgb(var(--color-accent-dark) / <alpha-value>)",
        },
        temaEmerald: {
          DEFAULT: "rgb(var(--color-secondary-primary) / <alpha-value>)",
          light: "rgb(var(--color-secondary-light) / <alpha-value>)",
          dark: "rgb(var(--color-secondary-dark) / <alpha-value>)",
        },
        temaViolet: {
          DEFAULT: "rgb(var(--color-tertiary-primary) / <alpha-value>)",
          light: "rgb(var(--color-tertiary-light) / <alpha-value>)",
          dark: "rgb(var(--color-tertiary-dark) / <alpha-value>)",
        },
      },
      backgroundImage: {
        "essencia-radiance":
          "radial-gradient(circle at 20% 20%, rgba(108, 99, 255, 0.2), transparent 45%), radial-gradient(circle at 80% 0%, rgba(179, 139, 89, 0.18), transparent 50%)",
      },
    },
  },
  plugins: [],
};
