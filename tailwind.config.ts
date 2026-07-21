import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#050816",
        navy: "#09142f",
        graphite: "#0b1b34",
        electric: "#28b8ff",
        royal: "#3138e8",
        gold: "#f7c948",
        mint: "#34d399",
        danger: "#fb7185"
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Narrow", "Arial", "sans-serif"],
        sans: ["var(--font-ui)", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 32px rgba(40,184,255,.22)",
        card: "0 18px 50px rgba(0,0,0,.35)"
      }
    }
  },
  plugins: []
};

export default config;
