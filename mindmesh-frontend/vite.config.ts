import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const beyKey = env.BEY_API_KEY || env.BEYOND_PRESENCE_API_KEY || ''
  const apiProxyTarget =
    env.API_PROXY_TARGET || env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '') || '/',
        },
        '/bey-api': {
          target: 'https://api.bey.dev',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/bey-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (beyKey) proxyReq.setHeader('x-api-key', beyKey)
            })
          },
        },
      },
    },
  }
})
