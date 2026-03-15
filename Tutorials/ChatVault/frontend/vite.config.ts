import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['soleils-mac-studio.tailcbe2ba.ts.net'],
  },
})
