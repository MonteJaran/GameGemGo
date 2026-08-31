import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built bundle loads correctly both from Capacitor's
  // local webview origin and from a plain `file://` preview.
  base: './',
  build: {
    target: 'es2020',
    // Keep the initial chunk small: split the Firebase SDK (only touched in
    // staging/production, via dynamic import) into its own chunk so
    // local_test cold start never pays for it.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase'
          }
          if (id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
