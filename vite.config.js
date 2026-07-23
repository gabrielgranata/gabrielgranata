import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Build-time asset compression (adopted 2026-07-20, decisions.md):
    // raster via sharp, SVG via svgo — svgo also strips hardcoded fills,
    // which mechanically enforces the currentColor theming convention.
    ViteImageOptimizer(),
  ],
})
