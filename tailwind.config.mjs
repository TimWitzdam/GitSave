/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        bg: {
          100: "#222222",
          200: "#191919",
          300: "#0F0F0F",
        },
        border: {
          100: "#5E5E5E",
          200: "#353535",
        },
        secondary: "#969699",
        red: "#FF453A",
        green: "#30D158",
      },
    },
  },
  plugins: [],
};
