import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  {
    path: '/',
    name: 'Auth',
    component: () => import('../views/Auth.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/bills',
    name: 'Bills',
    component: () => import('../views/Bills.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('../views/Stats.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true },
  },
  {
    // V1.2：账户管理
    path: '/settings/accounts',
    name: 'SettingsAccounts',
    component: () => import('../views/AccountsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    // V1.2：分类管理
    path: '/settings/categories',
    name: 'SettingsCategories',
    component: () => import('../views/CategoriesView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.name === 'Home' || to.name === 'Bills' || to.name === 'Stats') {
      return { top: 0 }
    }
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 关键：每次路由切换都等待 /me 验证完成
  //  - 防止"刷新后路由先到 Home，currentUser 还是缓存的旧值"
  //  - 防止"token 已吊销却停留在受保护页面"
  // BUGFIX: 移除冗余的 refreshMe() 调用 —— init() 内部已调 /me 验证，
  //  再次调用会导致刷新时 /me 接口被请求两次
  if (!authStore.initialized) {
    await authStore.init()
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/')
  } else if (!to.meta.requiresAuth && authStore.isLoggedIn) {
    // 已登录访问登录页 → 跳首页
    next('/home')
  } else {
    next()
  }
})

export default router