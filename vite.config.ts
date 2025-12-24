import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// Dev はルート配信、ビルド時のみサブディレクトリ用のベースパスを付与
// 配備先が https://kanekokikai-app.com/new_sirius/dist/ の場合に合わせる
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/new_sirius/dist/" : "/",
  plugins: [react()],
  server: {
    port: 5173
  }
}));

