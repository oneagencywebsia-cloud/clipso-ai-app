import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        clipso: {
          cyan: "#00D4FF",
          blue: "#0066FF",
          violet: "#7B2FFF",
          dark: "#0A0A1A",
          darker: "#050510",
          panel: "#0F0F1F"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      animation: {
        "gradient-x": "gradient-x 4s ease infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out"
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" }
        },
        "pulse-glow": {
          "0%, 100%": { "box-shadow": "0 0 20px rgba(0, 212, 255, 0.3)" },
          "50%": { "box-shadow": "0 0 40px rgba(0, 212, 255, 0.6)" }
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};
export default config;
