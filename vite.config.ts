import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.BUILD_TARGET ?? 'ecopatrimoine'

  return {
    plugins: [react()],
    define: {
      // Rend BUILD_TARGET accessible dans le code
      'import.meta.env.VITE_BUILD_TARGET': JSON.stringify(target),
    },
    build: {
      outDir: `dist`,           // toujours dist/ — Netlify s'occupe du reste
      emptyOutDir: true,
    },
  }
})
