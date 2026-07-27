/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Atompunk: olive-drab metal, amber phosphor, pip-boy green
        bg: "#10120a",
        surface: "#1a1d10",
        "surface-2": "#232816",
        border: "#3c4224",
        accent: "#fdb42a",
        "accent-soft": "rgba(253,180,42,0.12)",
        secondary: "#9dff5e",
        "secondary-soft": "rgba(157,255,94,0.12)",
        text: "#cfe3b0",
        "text-strong": "#f2ffd9",
        muted: "#7d8a63",
        positive: "#9dff5e",
        warn: "#ffd23e",
        danger: "#ff5e42",
      },
      fontFamily: {
        heading: ['"Press Start 2P"', "monospace"],
        body: ["VT323", "monospace"],
        mono: ["VT323", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "drill-spin": "drill-spin 1s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.85", filter: "brightness(1.3)" },
        },
        "drill-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};

