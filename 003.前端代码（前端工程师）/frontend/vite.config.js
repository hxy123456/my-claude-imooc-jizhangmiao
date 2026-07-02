import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 后端服务地址（开发期）
// 可通过环境变量覆盖：set COUNTCAT_API=http://localhost:4000 npm run dev
const API_TARGET = process.env.COUNTCAT_API || 'http://localhost:3001'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    // 前端 Vite 固定 3000（与 CLAUDE.md 一致），避免与后端 PORT=3001 冲突
    // 如果 Vite 占用了 3001，代理 target 也会指向自己 → /me 返回 404 → 刷新掉登录
    port: 3000,
    // /api/* 反向代理到后端，避免浏览器 CORS
    // /uploads/* 同样代理：后端把上传的头像写到 public/uploads/avatars/{userId}/...,
    //   前端 <img :src="user.avatar"> 使用的是相对路径 /uploads/...，dev 模式必须代理到后端
    //   否则 vite 自身接住 /uploads 请求会 404，生产构建后无此问题（nginx/同源）
    proxy: {
      '/api': {
        target: API_TARGET, // 默认 http://localhost:3001
        changeOrigin: true,
        // /api/auth/login → 后端 /api/auth/login（保留前缀）
        // 如需去掉 /api 前缀，把 rewrite 设为 '^/api': ''
      },
      '/uploads': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
