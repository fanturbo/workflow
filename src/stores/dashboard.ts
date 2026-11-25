/**
 * 工作台状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { todayLocal } from '@/utils/date'
import { useServices } from '@/services'
import type { Task, DashboardBlockType } from '@/types'

export const useDashboardStore = defineStore('dashboard', () => {
  const services = useServices()

  const blockTasks = ref<Record<DashboardBlockType, Task[]>>({
    must_finish_today: [],
    this_week: [],
    long_term: [],
    daily_routine: [],
  })
  const todayResults = ref<Task[]>([])
  const loading = ref(false)
  const overview = ref<{
    todayPending: number
    todayCompleted: number
    todayOverdue: number
  }>({ todayPending: 0, todayCompleted: 0, todayOverdue: 0 })

  /** 加载工作台区块数据 */
  async function loadDashboard() {
    loading.value = true
    try {
      const blocks = ['must_finish_today', 'this_week', 'long_term', 'daily_routine'] as DashboardBlockType[]
      const results = await Promise.all(blocks.map((b) => services.task.getDashboardBlockTasks(b)))

      blockTasks.value = {
        must_finish_today: results[0],
        this_week: results[1],
        long_term: results[2],
        daily_routine: results[3],
      }

      const today = todayLocal()
      const [stats, review] = await Promise.all([
        services.statistics.getOverview(),
        services.statistics.getReviewStatistics(today, today),
      ])
      todayResults.value = review.completedTasks
      overview.value = {
        todayPending: stats.todayTasks,
        todayCompleted: todayResults.value.length,
        todayOverdue: stats.todayOverdue,
      }
    } finally {
      loading.value = false
    }
  }

  /** 刷新单个区块 */
  async function refreshBlock(blockType: DashboardBlockType) {
    blockTasks.value[blockType] = await services.task.getDashboardBlockTasks(blockType)
  }

  /** 刷新概览 */
  async function refreshOverview() {
    const stats = await services.statistics.getOverview()
    overview.value = {
      todayPending: stats.todayTasks,
      todayCompleted: stats.todayCompleted,
      todayOverdue: stats.todayOverdue,
    }
  }

  return {
    todayResults,
    blockTasks,
    loading,
    overview,
    loadDashboard,
    refreshBlock,
    refreshOverview,
  }
})
