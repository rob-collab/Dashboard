import type { Config } from "tailwindcss";

const config: Config = {
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
        "bg-light": "#F3F4F6",
      },
      fontFamily: {
        inter: ["Inter", "system-ui", "sans-serif"],
        poppins: ["Poppins", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        bento: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        "bento-hover": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.10)",
      },
      animation: {
        "slide-up": "slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.3s ease forwards",
        highlight: "highlight 1.5s ease-out forwards",
      },
      keyframes: {
        slideUpFade: {
          from: { opacity: "0", transform: "translateY(10px)", filter: "blur(10px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        highlight: {
          "0%": { backgroundColor: "#E1BEE7" },
          "100%": { backgroundColor: "transparent" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
