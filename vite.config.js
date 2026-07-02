import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT: change '/CodeX/' to '/<your-repo-name>/' before deploying.
// If deploying to a *user/org* page (username.github.io repo), set base to '/'.
export default defineConfig({
  plugins: [react()],
  base: '/CodeX/',
});