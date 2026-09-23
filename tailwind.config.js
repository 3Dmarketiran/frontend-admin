/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Preflight is disabled on purpose: this project already ships a
  // hand-written design system in src/styles/global.css (buttons, cards,
  // form controls, etc). Tailwind is only used here for utility classes
  // (spacing, flex/grid, colors) inside a couple of pages — enabling
  // preflight would reset margins/typography across the whole app and
  // visually break every other page that relies on global.css.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
