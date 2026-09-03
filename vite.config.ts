import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // GitHub Pages serves the site from /WebPoint/ (project subpath).
  // Dev server stays at "/" to keep `npm run dev` simple.
  base: process.env.NODE_ENV === "production" ? "/WebPoint/" : "/",
  plugins: [react(), tailwindcss()],
});
