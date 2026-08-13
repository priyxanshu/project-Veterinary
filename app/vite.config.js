import { fileURLToPath, URL } from 'node:url'
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
  build: {
    // This is a multi-page app — index.html (citizen portal), back-office.html, and
    // certificate.html each mount a different React root. Without listing all three
    // here, `vite build` only emits index.html and drops the other two.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        backOffice: fileURLToPath(new URL('./back-office.html', import.meta.url)),
        certificate: fileURLToPath(new URL('./certificate.html', import.meta.url)),
      },
    },
  },
})
