import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        updraft: {
          deep: "#311B92",
          bar: "#673AB7",
          "dark-purple": "#4A148C",
          "bright-purple": "#7B1FA2",
          "medium-purple": "#9C27B0",
          "light-purple": "#BA68C8",
          "pale-purple": "#E1BEE7",
        },
        risk: {
          green: "#10B981",
          amber: "#F59E0B",
          red: "#DC2626",
        },
        fca: {
          "dark-gray": "#374151",
          gray: "#6b7280",
        },
        "bg-light": "#F8F7F4",
        surface: {
          warm: "#FEFDFB",
          muted: "#F8F7F4",
          dark: "#1C1B29",
        },
        "text-primary": "#1A1A2E",
        "text-secondary": "#6B6B6B",
      },
      fontFamily: {
        inter: ['"DM Sans"', "system-ui", "sans-serif"],
        poppins: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        bento:
          "0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.03)",
        "bento-hover":
          "0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.04)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.10)",
        "card-glow":
          "0 0 0 1px rgba(123,31,162,0.08), 0 2px 8px rgba(123,31,162,0.06)",
        layered:
          "0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      animation: {
        "slide-up": "slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.3s ease forwards",
        highlight: "highlight 1.5s ease-out forwards",
        "slide-in-right":
          "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "draw-arrow": "drawArrow 0.6s ease-out forwards",
        "entrance": "staggerIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      keyframes: {
        slideUpFade: {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
            filter: "blur(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
            filter: "blur(0)",
          },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        highlight: {
          "0%": { backgroundColor: "#E1BEE7" },
          "100%": { backgroundColor: "transparent" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        drawArrow: {
          from: { strokeDashoffset: "var(--length)" },
          to: { strokeDashoffset: "0" },
        },
        staggerIn: {
          from: {
            opacity: "0",
            transform: "translateY(12px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
