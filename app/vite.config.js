import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    charset: 'utf8',
  },
  resolve: {
    // src/*.jsx are symlinks to the top-level prototype files, which live outside
    // app/. Without this, Vite resolves imports (e.g. "lucide-react") relative to the
    // symlink's real path instead of app/node_modules, and the build fails to find them.
    preserveSymlinks: true,
  },
})
