<template>
  <div class="h-screen flex flex-col bg-cream overflow-hidden">
    <!-- Main Content -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <router-view @editRecord="openEdit" />
    </div>

    <!-- FAB -->
    <button
      v-if="authStore.isLoggedIn"
      @click="showAddSheet = true"
      class="fixed right-5 z-30 w-14 h-14 rounded-2xl bg-coral text-white text-2xl shadow-lg shadow-coral/30 flex items-center justify-center active:scale-90 transition-transform"
      :style="{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }"
    >+</button>

    <!-- Tab Bar -->
    <TabBar v-if="authStore.isLoggedIn" />

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

const router = useRouter()
const authStore = useAuthStore()
const store = useRecordStore()
const scrollContainer = ref(null)

// 监听路由变化，切换页面时滚动到顶部
watch(() => router.currentRoute.value, () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = 0
    }
  })
})

const showAddSheet = ref(false)
const showEditSheet = ref(false)
const editingRecord = ref(null)
const toastMsg = ref('')

function showToast(msg) {
  toastMsg.value = ''
  requestAnimationFrame(() => { toastMsg.value = msg })
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
    store.init()
  }
})
</script>
