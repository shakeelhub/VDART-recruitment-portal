import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Allow the custom host for dev server access
    allowedHosts: [
      'vd.rmt.com'
    ]
  }
})
