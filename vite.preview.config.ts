import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
// Preview build: one self-contained HTML file (JS, CSS and fonts inlined).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
  build: { outDir: "dist-preview", assetsInlineLimit: 100000000, cssCodeSplit: false },
});
