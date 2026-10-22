import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env variables so we can use them in this config file
  const env = loadEnv(mode, process.cwd(), '');

  // Local dev backend — comes from VITE_DEV_BACKEND in your .env
  const BACKEND = env.VITE_DEV_BACKEND;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true, // lets you open the site from your phone on the same Wi-Fi
      proxy: {
        '/api':       { target: BACKEND, changeOrigin: true },
        '/socket.io': { target: BACKEND, changeOrigin: true, ws: true },
      },
    },
  };
});

