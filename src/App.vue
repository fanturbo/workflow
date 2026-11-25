<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <NNotificationProvider>
        <NDialogProvider>
          <AppShell />
        </NDialogProvider>
      </NNotificationProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { NConfigProvider, NMessageProvider, NNotificationProvider, NDialogProvider, zhCN, dateZhCN, darkTheme, type GlobalThemeOverrides } from 'naive-ui'
import { todayLocal } from '@/utils/date'
import { useServices } from '@/services'
import AppShell from '@/components/layout/AppShell.vue'
import { useTaskStore } from '@/stores/task'
import { useWorkLogStore } from '@/stores/worklog'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'
import { useSettingsStore } from '@/stores/settings'
import { useDashboardStore } from '@/stores/dashboard'
import { useLayoutStore } from '@/stores/layout'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#6366F1',
    primaryColorHover: '#818CF8',
    primaryColorPressed: '#4F46E5',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: '14px',
  },
  Button: {
    borderRadiusMedium: '8px',
  },
  Card: {
    borderRadius: '12px',
    paddingMedium: '16px',
  },
  Tag: {
    borderRadius: '6px',
  },
}

const layoutStore = useLayoutStore()
const naiveTheme = computed(() => layoutStore.isDark ? darkTheme : null)
const services = useServices()

// 顶栏切换主题时同步写入用户设置，保证「设置页」与「顶栏」两端一致
watch(() => layoutStore.isDark, async (dark) => {
  try {
    await services.settings.updateSettings({ theme: dark ? 'dark' : 'light' })
  } catch {
    // 设置写入失败不应影响主题切换本身
  }
})

const taskStore = useTaskStore()
const workLogStore = useWorkLogStore()
const projectStore = useProjectStore()
const categoryStore = useCategoryStore()
const settingsStore = useSettingsStore()
const dashboardStore = useDashboardStore()

let lastDay = todayLocal()
let dayTimer: number
async function refreshOnNewDay() {
  const currentDay = todayLocal()
  if (document.hidden || currentDay === lastDay) return
  await services.recurrence.generateTodayTasks()
  await Promise.all([taskStore.loadAll(), workLogStore.loadToday(), dashboardStore.loadDashboard()])
  lastDay = currentDay
}

onUnmounted(() => {
  window.clearInterval(dayTimer)
  document.removeEventListener('visibilitychange', refreshOnNewDay)
})

onMounted(async () => {
  dayTimer = window.setInterval(refreshOnNewDay, 30000)
  document.addEventListener('visibilitychange', refreshOnNewDay)
  await Promise.all([
    taskStore.loadAll(),
    projectStore.loadAll(),
    categoryStore.loadAll(),
    settingsStore.loadSettings(),
    workLogStore.loadToday(),
  ])
  // 从 DB 同步主题（优先 localStorage，已在 layout store 初始化时处理）
  if (settingsStore.settings?.theme && !localStorage.getItem('theme')) {
    layoutStore.applyTheme(settingsStore.settings.theme === 'dark')
  }
  await dashboardStore.loadDashboard()
})
</script>
