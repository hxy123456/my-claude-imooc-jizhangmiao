import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './assets/css/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 等待路由初始导航完成（包括 beforeEach 守卫）后再挂载，
// 避免挂载过程中路由状态不稳定导致 API 重复调用（/me 等）
router.isReady().then(() => {
  app.mount('#app')
})
