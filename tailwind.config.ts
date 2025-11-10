import type { Config } from "tailwindcss";

export default {
  darkMode: "class", // ✅ perbaikan utama
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FDA50F", // Lighterracy Orange (locked)
          fg: "#111111",
          bg: "#ffffff",
          navy: "#0e2a47",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 6px 24px rgba(0,0,0,.06)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 20s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
