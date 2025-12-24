import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// Dev はルート配信、ビルド時のみサブディレクトリ用のベースパスを付与
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/new_sirius/dist/" : "/",
  plugins: [react()],
  server: {
    port: 5173
  }
}));

