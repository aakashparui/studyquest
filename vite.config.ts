import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages project sites serve from a sub-path. The deploy workflow sets
// BASE_PATH=/studyquest/; locally it stays at the root.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    // Listen on the LAN too, so the app can be opened from a phone on the
    // same Wi-Fi network.
    host: true,
  },
  preview: {
    port: 5181,
    host: true,
  },
})
