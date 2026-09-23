import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PUBLIC_BASE_PATH is set by the GitHub Actions workflow so a GitHub Pages
// *project* site (username.github.io/repo/) resolves asset URLs correctly.
// Defaults to "/" for a custom domain (e.g. admin.yourdomain.com).
const base = process.env.PUBLIC_BASE_PATH || "/";

export default defineConfig({
  plugins: [react()],
  base,
  server: { port: 5174 },
  build: { outDir: "dist", sourcemap: false },
});