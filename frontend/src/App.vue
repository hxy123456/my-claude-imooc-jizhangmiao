<template>
  <div class="h-screen flex flex-col bg-cream overflow-hidden">
    <!-- Main Content -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <router-view @editRecord="openEdit" @requestLogout="askLogout" @showToast="showToast" />
    </div>

    <!-- Tab Bar（含中间凸起的"+"按钮，点击通过 @add 事件触发新增弹层） -->
    <TabBar v-if="authStore.isLoggedIn" @add="showAddSheet = true" />

    <!-- Add Record Sheet -->
    <AddRecordSheet
      :open="showAddSheet"
      @close="showAddSheet = false"
      @submit="onAddRecord"
    />

    <!-- Edit Record Sheet -->
    <EditRecordSheet
      :open="showEditSheet"
      :record="editingRecord"
      @close="showEditSheet = false"
      @submit="onEditRecord"
      @delete="onDeleteRecord"
    />

    <!-- Toast -->
    <Toast :message="toastMsg" />

    <!-- Logout Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showLogoutModal"
          class="fixed inset-0 z-50 flex items-center justify-center px-6"
          @click.self="showLogoutModal = false"
        >
          <div class="absolute inset-0 bg-bark/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-xs bg-cream rounded-3xl p-6 shadow-2xl shadow-bark/30 fade-in-up">
            <div class="text-center mb-5">
              <div class="text-4xl mb-2">🚪</div>
              <h3 class="text-lg font-display text-bark">退出登录？</h3>
              <p class="text-xs text-clay/50 mt-1.5 leading-relaxed">
                退出后需要重新输入用户名和密码<br/>才能再次进入你的账本
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="showLogoutModal = false"
                :disabled="loggingOut"
                class="flex-1 py-3 rounded-2xl bg-sand text-clay text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
              >取消</button>
              <button
                @click="confirmLogout"
                :disabled="loggingOut"
                class="flex-1 py-3 rounded-2xl bg-coral text-white text-sm font-semibold active:scale-[0.98] transition-transform shadow-md shadow-coral/30 disabled:opacity-50"
              >
                <span v-if="loggingOut" class="inline-flex items-center gap-1.5">
                  <span class="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  退出中
                </span>
                <span v-else>确认退出</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import TabBar from './components/TabBar.vue'
import AddRecordSheet from './components/AddRecordSheet.vue'
import EditRecordSheet from './components/EditRecordSheet.vue'
import Toast from './components/Toast.vue'
import { useAuthStore } from './stores/auth.js'
import { useRecordStore } from './stores/records.js'
import { useAccountStore } from './stores/accounts.js'
import { useCategoryStore } from './stores/categories.js'

const router = useRouter()
const authStore = useAuthStore()
const store = useRecordStore()
const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const scrollContainer = ref(null)

/**
 * V1.2+：登录态建立后初始化用户级数据（账户、分类、记录）。
 * - 在 login() 成功后（userId 可用时）调用
 * - 登出 / 切换账号时调用 reset() 清空
 * - 不再传 userId：HTTP 路径里 token 自带身份
 */
function initUserScopedStores() {
  if (authStore.isLoggedIn) {
    accountStore.initForUser()
    categoryStore.initForUser()
    store.init()
  } else {
    accountStore.reset()
    categoryStore.reset()
    store.reset()
  }
}

// 监听路由变化，切换页面时滚动到顶部
watch(() => router.currentRoute.value, () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = 0
    }
  })
})

// 监听 isLoggedIn：从 true 变 false 时（token 被吊销/过期）自动跳登录页
// 用户主动 logout 时 loggingOut=true，跳过这条路径（confirmLogout 会自己 push）
// 同时：true 变 true 时（即 token 恢复 / 刷新后）确保账户/分类 store 被重新初始化
watch(() => authStore.isLoggedIn, (loggedIn, wasLoggedIn) => {
  if (wasLoggedIn && !loggedIn && !loggingOut.value) {
    // eslint-disable-next-line no-console
    console.warn('[app] 检测到登录态失效，跳转登录页')
    router.push('/')
    showToast('登录已失效，请重新登录')
  } else if (loggedIn && authStore.userId) {
    // 进入登录态：保证账户/分类 store 是当前用户的
    initUserScopedStores()
  }
})

const showAddSheet = ref(false)
const showEditSheet = ref(false)
const showLogoutModal = ref(false)
const loggingOut = ref(false)
const editingRecord = ref(null)
const toastMsg = ref('')

function showToast(msg) {
  toastMsg.value = ''
  requestAnimationFrame(() => { toastMsg.value = msg })
}

function askLogout() {
  showLogoutModal.value = true
}

async function confirmLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authStore.logout()
    store.reset()
    accountStore.reset()
    categoryStore.reset()
    showLogoutModal.value = false
    await router.push('/')
    showToast('已退出登录')
  } finally {
    loggingOut.value = false
  }
}

async function onAddRecord(data) {
  await store.add(data)
  showToast('已记录 ✓')
}

function openEdit(record) {
  editingRecord.value = record
  showEditSheet.value = true
}

async function onEditRecord(data) {
  if (!editingRecord.value) return
  await store.update(editingRecord.value.id, data)
  showToast('已更新 ✓')
  showEditSheet.value = false
}

async function onDeleteRecord() {
  if (!editingRecord.value) return
  await store.remove(editingRecord.value.id)
  showToast('已删除')
  showEditSheet.value = false
}

// V1.1+：authStore.init() 是异步的（会调 /me 验证 token），必须 await
// 否则后续的 isLoggedIn 检查会拿到陈旧值，导致登录后首页不显示
onMounted(async () => {
  await authStore.init()
  if (authStore.isLoggedIn) {
    initUserScopedStores()
  }
})
</script>
