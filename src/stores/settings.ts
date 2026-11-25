/**
 * 设置状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useServices } from '@/services'
import type { UserSettings, DashboardBlockConfig, DashboardBlockType } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const services = useServices()

  const settings = ref<UserSettings | null>(null)
  const dashboardBlocks = ref<DashboardBlockConfig[]>([])
  const loading = ref(false)

  async function loadSettings() {
    loading.value = true
    try {
      settings.value = await services.settings.getSettings()
      dashboardBlocks.value = await services.settings.getDashboardBlocks()
    } finally {
      loading.value = false
    }
  }

  async function updateTheme(theme: 'light' | 'dark') {
    settings.value = await services.settings.updateTheme(theme)
  }

  async function updateTimezone(timezone: string) {
    settings.value = await services.settings.updateTimezone(timezone)
  }

  async function updateBlockOrder(types: DashboardBlockType[]) {
    await services.settings.updateBlockOrder(types)
    dashboardBlocks.value = await services.settings.getDashboardBlocks()
  }

  async function toggleBlockVisible(type: DashboardBlockType, visible: boolean) {
    await services.settings.toggleBlockVisible(type, visible)
    dashboardBlocks.value = await services.settings.getDashboardBlocks()
  }

  return {
    settings,
    dashboardBlocks,
    loading,
    loadSettings,
    updateTheme,
    updateTimezone,
    updateBlockOrder,
    toggleBlockVisible,
  }
})
