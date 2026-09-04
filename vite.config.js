import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Evaluated once when the dev server starts or a build begins. On Vercel a
// production build only runs after a merge lands on master, so this is the
// date the live site was last deployed — not the visitor's clock.
const BUILD_TIME = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
});
