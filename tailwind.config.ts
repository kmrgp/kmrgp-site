import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: "#FF6F00",
          hover: "#E65F00",
          light: "rgba(255, 111, 0, 0.08)",
          glow: "rgba(255, 111, 0, 0.35)",
        },
        maroon: {
          DEFAULT: "#800020",
          hover: "#600018",
          light: "rgba(128, 0, 32, 0.08)",
          deep: "#4A0012",
        },
        gold: {
          DEFAULT: "#C5A55A",
          bright: "#E8C872",
          hover: "#B08F47",
          light: "rgba(197, 165, 90, 0.15)",
        },
        cream: {
          DEFAULT: "#FFFDF7",
          dark: "#F7F2E4",
          warm: "#FFF9F0",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-playfair)", "Georgia", "serif"],
        hindi: ["var(--font-hindi)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-sm": ["2.25rem", { lineHeight: "1.12", letterSpacing: "-0.02em", fontWeight: "700" }],
        display: ["3.35rem", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        "display-lg": ["3.75rem", { lineHeight: "1.08", letterSpacing: "-0.03em", fontWeight: "700" }],
        h1: ["2rem", { lineHeight: "1.2", fontWeight: "700" }],
        "h1-lg": ["2.5rem", { lineHeight: "1.15", fontWeight: "700" }],
        h2: ["1.75rem", { lineHeight: "1.25", fontWeight: "700" }],
        "h2-lg": ["1.875rem", { lineHeight: "1.22", fontWeight: "700" }],
        h3: ["1.25rem", { lineHeight: "1.35", fontWeight: "700" }],
        "body-lg": ["1.125rem", { lineHeight: "1.65" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.45", fontWeight: "600" }],
        stat: ["1.75rem", { lineHeight: "1.1", fontWeight: "700" }],
        "stat-lg": ["1.875rem", { lineHeight: "1.1", fontWeight: "700" }],
        "stat-label": ["0.8125rem", { lineHeight: "1.5", fontWeight: "500" }],
      },
      boxShadow: {
        sm: "0 4px 12px rgba(128, 0, 32, 0.04)",
        md: "0 8px 24px rgba(128, 0, 32, 0.08)",
        lg: "0 16px 36px rgba(128, 0, 32, 0.12)",
        hero: "0 8px 32px rgba(0, 0, 0, 0.28)",
        saffron: "0 6px 24px rgba(255, 111, 0, 0.35)",
      },
      letterSpacing: {
        heritage: "0.18em",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "lang-flip": {
          "0%": { opacity: "0", transform: "translateY(6px) scale(0.92)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "content-in": {
          "0%": { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "stat-pop": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "lang-flip": "lang-flip 0.28s ease-out",
        "content-in": "content-in 0.32s ease-out",
        "stat-pop": "stat-pop 0.45s ease-out both",
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
