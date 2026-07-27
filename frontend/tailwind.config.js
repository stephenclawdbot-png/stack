/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#071b27",
        surface: "#0d2535",
        "surface-2": "#142e3f",
        border: "#1e3a4f",
        accent: "#f59e0b",
        "accent-soft": "rgba(245,158,11,0.12)",
        secondary: "#06b6d4",
        "secondary-soft": "rgba(6,182,212,0.12)",
        text: "#e2e8f0",
        "text-strong": "#f8fafc",
        muted: "#64748b",
        positive: "#34d399",
        warn: "#fbbf24",
        danger: "#ef4444",
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

