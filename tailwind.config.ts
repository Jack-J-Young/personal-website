import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      colors: {
        navBar: "#36364a",
        background: "#484956",
      }
    }
  },

  darkMode: 'media',

  plugins: [require("@tailwindcss/typography")]
} as Config;
