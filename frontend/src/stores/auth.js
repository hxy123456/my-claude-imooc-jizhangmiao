import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { registerUser, loginUser, getUserById } from '../utils/db.js'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const error = ref('')

  const isLoggedIn = computed(() => !!currentUser.value)
  const userId = computed(() => currentUser.value?.id || 0)
  const username = computed(() => currentUser.value?.username || '')

  function init() {
    const session = sessionStorage.getItem('countcat_session')
    if (session) {
      try {
        const parsed = JSON.parse(session)
        currentUser.value = parsed
      } catch {
        sessionStorage.removeItem('countcat_session')
      }
    }
  }

  async function login(user, password) {
    error.value = ''
    try {
      const userObj = await loginUser(user, password)
      currentUser.value = userObj
      sessionStorage.setItem('countcat_session', JSON.stringify(userObj))
      return true
    } catch (e) {
      error.value = e.message
      return false
    }
  }

  async function register(user, password) {
    error.value = ''
    try {
      const userObj = await registerUser(user, password)
      currentUser.value = userObj
      sessionStorage.setItem('countcat_session', JSON.stringify(userObj))
      return true
    } catch (e) {
      error.value = e.message
      return false
    }
  }

  function logout() {
    currentUser.value = null
    error.value = ''
    sessionStorage.removeItem('countcat_session')
  }

  return { currentUser, error, isLoggedIn, userId, username, init, login, register, logout }
})
