import type { Config } from "tailwindcss";

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
        paper: "var(--ledger-paper)",
        "paper-raised": "var(--paper-raised)",
        "ink-navy": "var(--ink-navy)",
        "ink-navy-soft": "var(--ink-navy-soft)",
        reconciled: "var(--reconciled-green)",
        "reconciled-tint": "var(--reconciled-green-tint)",
        exception: "var(--exception-red)",
        "exception-tint": "var(--exception-red-tint)",
        trace: "var(--trace-blue)",
        "trace-tint": "var(--trace-blue-tint)",
        brass: "var(--brass-gold)",
        "brass-tint": "var(--brass-gold-tint)",
        hairline: "var(--hairline)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      transitionDuration: {
        fast: "150ms",
        base: "280ms",
        slow: "450ms",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(.2,.7,.2,1)",
        inout: "cubic-bezier(.4,0,.2,1)",
      },
      keyframes: {
        settle: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        stamp: {
          "0%": { transform: "scale(1.15)", opacity: "0" },
          "60%": { transform: "scale(0.98)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "trace-pulse": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "var(--trace-blue-tint)" },
        },
      },
      animation: {
        settle: "settle 300ms cubic-bezier(.2,.7,.2,1) both",
        stamp: "stamp 350ms cubic-bezier(.2,.7,.2,1) both",
        "trace-pulse": "trace-pulse 600ms ease-out 1",
      },
    },
  },
  plugins: [],
};
export default config;
