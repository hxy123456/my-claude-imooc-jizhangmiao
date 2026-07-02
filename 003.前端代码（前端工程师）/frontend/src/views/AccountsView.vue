<template>
  <div class="px-5 pt-2 pb-4">
    <!-- Header -->
    <div class="flex items-center mb-6">
      <button
        @click="router.back()"
        class="w-9 h-9 rounded-xl bg-sand flex items-center justify-center text-clay/60 text-sm active:scale-95 transition-transform mr-3"
        title="返回"
      >←</button>
      <h1 class="text-2xl font-display text-bark flex-1">账户管理</h1>
      <button
        @click="openAddSheet"
        class="px-3 py-1.5 rounded-xl bg-bark text-cream text-xs font-semibold active:scale-95 transition-transform shadow-md shadow-bark/20"
      >+ 添加</button>
    </div>

    <!-- Account List -->
    <div v-if="accountStore.list.length" class="bg-white/60 backdrop-blur-sm rounded-3xl shadow-lg shadow-bark/5 fade-in-up overflow-hidden">
      <div
        v-for="(acc, idx) in accountStore.list"
        :key="acc.id"
      >
        <div class="flex items-center space-x-3 px-5 py-4">
          <!-- Icon -->
          <div
            class="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm"
            :style="{ background: iconBgFor(acc.icon) }"
          >{{ acc.icon }}</div>

          <!-- Name + Tag -->
          <div class="flex-1 min-w-0">
            <div class="text-sm text-bark font-medium truncate">{{ acc.name }}</div>
            <div v-if="acc.isSystem" class="text-[10px] text-clay/40 mt-0.5">内置账户</div>
            <div v-else class="text-[10px] text-clay/40 mt-0.5">自定义</div>
          </div>

          <!-- Action: Edit / Delete -->
          <div class="flex items-center space-x-2">
            <button
              @click="onEdit(acc)"
              class="w-8 h-8 rounded-lg bg-sand text-clay/60 text-xs flex items-center justify-center active:scale-90 transition-transform"
              title="编辑"
            >✎</button>
            <button
              v-if="!acc.isSystem"
              @click="onDelete(acc)"
              class="w-8 h-8 rounded-lg bg-coral/10 text-coral text-xs flex items-center justify-center active:scale-90 transition-transform"
              title="删除"
            >✕</button>
          </div>
        </div>
        <div v-if="idx < accountStore.list.length - 1" class="h-px bg-sand/60 mx-5"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white/60 backdrop-blur-sm rounded-3xl p-10 text-center shadow-lg shadow-bark/5 fade-in-up">
      <div class="text-5xl mb-3">💳</div>
      <p class="text-sm text-clay/60">还没有账户</p>
      <p class="text-xs text-clay/40 mt-1.5">点击右上角"添加"创建你的第一个账户</p>
    </div>

    <!-- Add/Edit Account Sheet -->
    <AddAccountSheet
      :open="showSheet"
      @close="closeSheet"
      @save="onSave"
    />

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="confirming"
          class="fixed inset-0 z-50 flex items-center justify-center px-6"
          @click.self="confirming = null"
        >
          <div class="absolute inset-0 bg-bark/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-xs bg-cream rounded-3xl p-6 shadow-2xl shadow-bark/30 fade-in-up">
            <div class="text-center mb-5">
              <div class="text-4xl mb-2">🗑️</div>
              <h3 class="text-lg font-display text-bark">删除账户？</h3>
              <p class="text-xs text-clay/50 mt-1.5 leading-relaxed">
                确定要删除 <span class="font-semibold text-bark">{{ confirming.name }}</span> 吗？<br/>
                该操作不可撤销
              </p>
            </div>
            <div class="flex space-x-2">
              <button
                @click="confirming = null"
                class="flex-1 py-3 rounded-2xl bg-sand text-clay text-sm font-medium active:scale-[0.98] transition-transform"
              >取消</button>
              <button
                @click="doDelete"
                class="flex-1 py-3 rounded-2xl bg-coral text-white text-sm font-semibold active:scale-[0.98] transition-transform shadow-md shadow-coral/30"
              >删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '../stores/accounts.js'
import AddAccountSheet from '../components/AddAccountSheet.vue'

const router = useRouter()
const accountStore = useAccountStore()

const showSheet = ref(false)
const editingAcc = ref(null) // null = 新增；object = 编辑
const confirming = ref(null) // null = 无；object = 待删除的账户

const ACCENT_COLORS = ['#FFE4D6', '#E0F5EC', '#E5E1F7', '#FCE5C5', '#FFE0E9', '#D6EAF8', '#F0E5D8', '#E8F4D8']

function iconBgFor(icon) {
  let h = 0
  for (let i = 0; i < (icon || '').length; i++) {
    h = (h * 31 + icon.charCodeAt(i)) >>> 0
  }
  return ACCENT_COLORS[h % ACCENT_COLORS.length]
}

onMounted(() => {
  // 进入账户管理：从后端拉一次（保证多设备一致）
  if (!accountStore.list.length) {
    accountStore.initForUser()
  }
})

function openAddSheet() {
  editingAcc.value = null
  showSheet.value = true
}

function onEdit(acc) {
  editingAcc.value = acc
  showSheet.value = true
}

function closeSheet() {
  showSheet.value = false
  editingAcc.value = null
}

async function onSave({ name, icon }) {
  if (editingAcc.value) {
    await accountStore.update(editingAcc.value.id, { name, icon })
  } else {
    await accountStore.add({ name, icon })
  }
  closeSheet()
}

function onDelete(acc) {
  confirming.value = acc
}

async function doDelete() {
  if (!confirming.value) return
  await accountStore.remove(confirming.value.id)
  confirming.value = null
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
