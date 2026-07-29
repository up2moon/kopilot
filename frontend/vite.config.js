import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const localApiProxyTarget =
    env.DEV_API_PROXY_TARGET || "http://localhost:3001";
  const checkApiProxyTarget =
    env.CHECK_API_PROXY_TARGET || "https://kospay.p-e.kr";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      // Docker 바인드 마운트(특히 macOS)에서는 파일 변경 이벤트가 컨테이너로
      // 전달되지 않아 HMR이 동작하지 않는다. 폴링 기반 감시로 전환한다.
      watch: {
        usePolling: true,
        interval: 300,
      },
      proxy: {
        "/api/investment": {
          target: checkApiProxyTarget,
          changeOrigin: true,
          secure: true,
        },
        "/api": {
          target: localApiProxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
