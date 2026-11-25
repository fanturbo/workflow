import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useLayoutStore = defineStore('layout', () => {
  const sidebarCollapsed = ref(window.innerWidth < 1100)
  const isDark = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function collapse() {
    sidebarCollapsed.value = true
  }

  function applyTheme(dark: boolean) {
    isDark.value = dark
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleTheme() {
    applyTheme(!isDark.value)
  }

  // 初始化时从 localStorage 读取，避免首次加载闪烁
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') applyTheme(true)

  // 持久化到 localStorage
  watch(isDark, (val) => {
    localStorage.setItem('theme', val ? 'dark' : 'light')
  })

  return { sidebarCollapsed, isDark, toggleSidebar, collapse, applyTheme, toggleTheme }
})
