import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      // Values come from the CSS custom properties in app.css, so `bg-surface`
      // and `var(--surface)` are always the same colour and theming happens in
      // one place.
      colors: {
        bg: "var(--bg)",
        "bg-translucent": "var(--bg-translucent)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        border: "var(--border)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-contrast": "var(--accent-contrast)",
        "accent-subtle": "var(--accent-subtle)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      boxShadow: {
        DEFAULT: "var(--shadow)",
      },
    }
  },

  // Matches the toggle's data-theme attribute rather than only the OS setting,
  // so `dark:` variants agree with an explicit user choice.
  darkMode: ["class", '[data-theme="dark"]'],

  plugins: [require("@tailwindcss/typography")]
} as Config;
