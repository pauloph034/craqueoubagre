import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#080808",
        navy: "#ffffff",
        graphite: "#242424",
        electric: "#12a66a",
        royal: "#08764a",
        gold: "#bd8121",
        mint: "#147a63",
        danger: "#a52a3a"
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Narrow", "Arial", "sans-serif"],
        sans: ["var(--font-ui)", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "none",
        card: "none"
      }
    }
  },
  plugins: []
};

export default config;
