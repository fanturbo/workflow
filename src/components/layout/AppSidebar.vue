<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <div class="sidebar-logo" @click="goToDashboard">
      <span class="logo-icon">W</span>
      <span v-show="!collapsed" class="logo-text">WorkFlow</span>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        :title="collapsed ? item.title : ''"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span v-show="!collapsed" class="nav-label">{{ item.title }}</span>
      </router-link>
    </nav>

    <div class="sidebar-divider" />

    <div class="sidebar-bottom">
      <router-link
        v-for="item in bottomItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        :title="collapsed ? item.title : ''"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span v-show="!collapsed" class="nav-label">{{ item.title }}</span>
      </router-link>
    </div>

    <!-- 侧边栏收起/展开按钮 -->
    <button
      class="profile-sidebar-toggle"
      :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
      @click="layoutStore.toggleSidebar()"
    >
      <span>{{ collapsed ? '›' : '‹' }}</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'

defineProps<{ collapsed: boolean }>()

const router = useRouter()
const layoutStore = useLayoutStore()

const navItems = [
  { path: '/dashboard', title: '工作台', icon: '⌂' },
  { path: '/daily-plan', title: '每日计划', icon: '✓' },
  { path: '/tasks', title: '全部任务', icon: '≡' },
  { path: '/work-logs', title: '工作日志', icon: '◷' },
  { path: '/review', title: '工作复盘', icon: '◎' },
]

const bottomItems = [
  { path: '/settings', title: '设置', icon: '⚙' },
  { path: '/data-management', title: '数据管理', icon: '⇄' },
  { path: '/profile', title: '个人信息', icon: '○' },
]

function isActive(path: string): boolean {
  return router.currentRoute.value.path === path
}

function goToDashboard() {
  router.push('/dashboard')
}
</script>

<style scoped>
.app-sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-base), background-color var(--transition-base);
  overflow: visible;
  position: relative;
}

.app-sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  cursor: pointer;
  border-bottom: 1px solid var(--sidebar-border);
  overflow: hidden;
}

.logo-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--color-primary);
  color: white;
  font-size: 15px;
  font-weight: 800;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  color: var(--sidebar-logo-text);
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-nav {
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  padding: 8px 12px;
  border-radius: 9px;
  color: var(--sidebar-text);
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
}

.nav-item:hover {
  background-color: var(--sidebar-hover-bg);
  color: var(--sidebar-text-strong);
}

.nav-item.active {
  background-color: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
  font-weight: var(--font-weight-medium);
}

.nav-icon {
  font-size: 17px;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
}

.sidebar-divider {
  flex: 1;
}

.sidebar-bottom {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-top: 1px solid var(--sidebar-border);
  overflow: hidden;
}

/* 移动端 */
@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    z-index: var(--z-sidebar);
    height: 100vh;
    transform: translateX(0);
    box-shadow: var(--sidebar-shadow);
  }

  .app-sidebar.collapsed {
    transform: translateX(-100%);
    width: var(--sidebar-width);
  }
}

/* 个人信息页侧边栏切换按钮 */
.profile-sidebar-toggle {
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 48px;
  background: var(--sidebar-toggle-bg);
  border: 1px solid var(--sidebar-chip-border);
  border-left: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sidebar-toggle-text);
  font-size: 14px;
  transition: all var(--transition-fast);
  z-index: 10;
}

.profile-sidebar-toggle:hover {
  background: var(--sidebar-toggle-hover-bg);
  color: var(--sidebar-active-text);
  width: 20px;
  right: -20px;
}
</style>
