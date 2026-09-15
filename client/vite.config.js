import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const BACKEND_ORIGIN = process.env.VITE_DEV_BACKEND_ORIGIN || "http://localhost:5001";

export default defineConfig({
  plugins: [react(), svgr()],

  server: {
    port: 5000,
    strictPort: true,
    proxy: {
      // REST traffic. Proxying keeps development same-origin, so the HttpOnly
      // refresh cookie behaves exactly as it does in production.
      "/api": {
        target: BACKEND_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      // Socket.io handshake plus the WebSocket upgrade.
      "/socket.io": {
        target: BACKEND_ORIGIN,
        ws: true,
        changeOrigin: true
      }
    }
  },

  preview: {
    port: 5000,
    strictPort: true
  },

  build: {
    outDir: "build",
    // Source maps make production stack traces readable without shipping
    // original sources to the browser.
    sourcemap: "hidden",
    chunkSizeWarningLimit: 600
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.js"],
    css: false,
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/**/*.{test,spec}.{js,jsx}", "src/setupTests.js", "src/index.jsx"]
    }
  }
});
