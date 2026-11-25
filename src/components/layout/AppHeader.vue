<template>
  <header class="app-header">
    <div class="header-left" :class="{ hidden: isProfilePage }">
      <button class="header-btn menu-toggle" @click="$emit('toggle-sidebar')">
        <span>≡</span>
      </button>
      <h1 class="header-title">{{ currentTitle }}</h1>
    </div>

    <div class="header-center">
      <div class="search-box" @click="openSearch">
        <span class="search-icon">⌕</span>
        <input
          ref="searchInput"
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索任务、日志... (⌘K)"
          @keyup.enter="doSearch"
        />
        <span class="search-shortcut">⌘K</span>
      </div>
    </div>

    <div class="header-right">
      <button class="header-btn theme-toggle" :title="layoutStore.isDark ? '切换亮色模式' : '切换暗色模式'" @click="layoutStore.toggleTheme()">
        <span>{{ layoutStore.isDark ? '☀' : '☾' }}</span>
      </button>
      <button class="header-btn action-task" title="快速新增任务 (N)" @click="$emit('quick-add-task')">
        <span>＋</span>
        <span class="btn-label">任务</span>
      </button>
      <button class="header-btn action-log" title="随手记一句话或想法" @click="$emit('quick-add-note')">
        <span>◷</span>
        <span class="btn-label">记录</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'

const emit = defineEmits<{
  'toggle-sidebar': []
  'quick-add-task': []
  'quick-add-note': []
}>()

const router = useRouter()
const layoutStore = useLayoutStore()

const searchKeyword = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

const currentTitle = computed(() => {
  const route = router.currentRoute.value
  return (route.meta?.title as string) ?? 'WorkFlow'
})

const isProfilePage = computed(() => router.currentRoute.value.path === '/profile')

function openSearch() {
  searchInput.value?.focus()
}

function doSearch() {
  if (!searchKeyword.value.trim()) return
  router.push({ path: '/tasks', query: { keyword: searchKeyword.value } })
}

// 全局快捷键
function handleKeydown(e: KeyboardEvent) {
  // Ctrl/Cmd + K 全局搜索
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchInput.value?.focus()
  }
  // N 快速新增任务（输入框焦点时不触发）
  if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !isInputFocused()) {
    e.preventDefault()
    emit('quick-add-task')
  }
}

function isInputFocused(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || el.isContentEditable
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  flex-shrink: 0;
  gap: var(--spacing-md);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header-left.hidden {
  visibility: hidden;
  pointer-events: none;
}

.menu-toggle {
  display: flex;
}

.header-title {
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  white-space: nowrap;
}

.header-center {
  flex: 1;
  max-width: 560px;
  display: flex;
  justify-content: center;
}

.search-box {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: text;
  transition: border-color var(--transition-fast);
}

.search-box:focus-within {
  border-color: var(--color-primary);
  background: var(--color-background);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}

.search-icon {
  color: var(--color-text-tertiary);
  font-size: 16px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-shortcut {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding: 2px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.theme-toggle {
  width: 36px;
  padding: 0;
  justify-content: center;
  font-size: 16px;
  color: var(--color-text-secondary);
}

.theme-toggle:hover {
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  border-color: transparent;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid var(--color-border-light);
  background-color: var(--color-background);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.header-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.action-task {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.2);
}

.action-task:hover {
  border-color: var(--color-primary-hover);
  background: var(--color-primary-hover);
  color: white;
  transform: translateY(-1px);
}

.action-log {
  border-color: var(--color-border-light);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.action-log:hover {
  background: var(--color-surface-hover);
  color: var(--color-primary-hover);
  transform: translateY(-1px);
}

.btn-label {
  white-space: nowrap;
}

/* 移动端 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 14px;
  }

  .header-title {
    font-size: var(--font-size-base);
  }

  .btn-label {
    display: none;
  }

  .header-center {
    display: none;
  }

  .header-right {
    margin-left: auto;
  }

  .header-right .header-btn {
    width: 38px;
    padding: 0;
    justify-content: center;
  }
}
</style>
