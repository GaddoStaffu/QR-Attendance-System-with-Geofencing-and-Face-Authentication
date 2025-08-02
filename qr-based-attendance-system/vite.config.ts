import fs from "fs";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000, // Optional, set the port you prefer
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "../certs", "cert.key")), // Private key
      cert: fs.readFileSync(path.resolve(__dirname, "../certs", "cert.crt")), // Public certificate
    },
  },
});
