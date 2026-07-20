import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#050816",
        navy: "#09142f",
        electric: "#28b8ff",
        violet: "#6d3cff",
        gold: "#f7c948",
        mint: "#34d399",
        danger: "#fb7185"
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
