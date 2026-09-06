import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { target: 'es2020' },
  // Le tag Git est injecte au build : on sait quelle version tourne sur le VPS
  // sans avoir a fouiller, ce qui compte le jour ou un cache reste coince.
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION ?? 'dev'),
  },
})
