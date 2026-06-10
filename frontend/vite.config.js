import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 后端服务地址（开发期）
// 可通过环境变量覆盖：set COUNTCAT_API=http://localhost:4000 npm run dev
const API_TARGET = process.env.COUNTCAT_API || 'http://localhost:3001'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3001,
    // /api/* 反向代理到后端，避免浏览器 CORS
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        // /api/auth/login → 后端 /api/auth/login（保留前缀）
        // 如需去掉 /api 前缀，把 rewrite 设为 '^/api': ''
      },
    },
  },
})
