import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, ['VITE_', 'REACT_APP_'])

  return {
    logLevel: 'error', // Suppress warnings, only show errors
    // REACT_APP_* is not a Vite convention, but the backend config is documented
    // under that name, so both prefixes are exposed on import.meta.env.
    envPrefix: ['VITE_', 'REACT_APP_'],
    plugins: [react()],
    server: {
      // In production Nginx serves the bundle and the API from one origin. Proxying
      // /api here reproduces that locally, so browser requests stay same-origin and
      // the API never has to answer a CORS preflight. Leave VITE_API_URL empty to
      // use this; setting it to an absolute URL bypasses the proxy, which is what a
      // Capacitor build on a device needs to reach the dev machine.
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      // Mirrors the "@/*" -> "./src/*" mapping in jsconfig.json. This used to come
      // from the previous Vite plugin, so it has to be declared here now that the
      // plugin is gone, or every "@/..." import fails to resolve at build time.
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
  }
})
