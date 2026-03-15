import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    allowedHosts: ['soleils-mac-studio.tailcbe2ba.ts.net'],
  },
})
