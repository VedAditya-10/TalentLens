import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === DARK MODE PALETTE (Obsidian + Safety Orange) ===
        surface: {
          DEFAULT: "var(--surface)",
          dim: "var(--bg)",
          bright: "var(--surface-highlight)",
          "container-lowest": "var(--bg)",
          "container-low": "var(--surface)",
          container: "var(--surface)",
          "container-high": "var(--surface-elevated)",
          "container-highest": "var(--surface-highlight)",
          elevated: "var(--surface-elevated)",
          highlight: "var(--surface-highlight)",
          variant: "var(--surface-elevated)",
        },
        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface)",
        "on-surface-muted": "var(--on-surface-muted)",
        "inverse-surface": "var(--on-surface)",
        "inverse-on-surface": "var(--bg)",
        outline: {
          DEFAULT: "var(--border)",
          variant: "var(--border)",
        },
        "border-subtle": "var(--border)",
        primary: {
          DEFAULT: "var(--primary)",
          container: "var(--primary)",
          fixed: "var(--primary)",
          "fixed-dim": "var(--primary)",
        },
        "on-primary": "var(--on-primary)",
        "on-primary-container": "var(--on-primary)",
        "on-primary-fixed": "var(--on-primary)",
        "on-primary-fixed-variant": "var(--on-primary)",
        "inverse-primary": "var(--primary)",
        secondary: {
          DEFAULT: "#c6c6cf",
          container: "#45464e",
          fixed: "#e2e1eb",
          "fixed-dim": "#c6c6cf",
        },
        "on-secondary": "#2f3037",
        "on-secondary-container": "#b4b4bd",
        tertiary: {
          DEFAULT: "#93ccff",
          container: "#00a2f4",
          fixed: "#cde5ff",
          "fixed-dim": "#93ccff",
        },
        "on-tertiary": "#003351",
        "on-tertiary-container": "#003554",
        error: {
          DEFAULT: "#ffb4ab",
          container: "#93000a",
        },
        "on-error": "#690005",
        "on-error-container": "#ffdad6",
        background: "var(--bg)",
        "on-background": "var(--on-surface)",

        // === LIGHT MODE OVERRIDES (applied via .light class) ===
        // These are applied via CSS variables in globals.css
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        gutter: "12px",
        "sidebar-width": "208px",
        "inspector-width": "320px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "12px", fontWeight: "500" }],
        "label-xs": ["10px", { lineHeight: "12px", fontWeight: "500" }],
        "label-sm": ["11px", { lineHeight: "14px", fontWeight: "600" }],
        "label-md": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" },
        ],
        "label-lg": ["13px", { lineHeight: "18px", fontWeight: "700" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "headline-sm": [
          "18px",
          { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "800" },
        ],
      },
      boxShadow: {
        "rank-glow": "0 0 15px rgba(249, 115, 22, 0.15)",
        "action-bar": "0 8px 32px rgba(0, 0, 0, 0.6)",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
