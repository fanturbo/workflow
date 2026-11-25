/**
 * 工作日志状态管理
 */

import { todayLocal } from '@/utils/date'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useServices } from '@/services'
import type { WorkLog, WorkLogDetailType } from '@/types'

export const useWorkLogStore = defineStore('workLog', () => {
  const services = useServices()

  const workLogs = ref<WorkLog[]>([])
  const loading = ref(false)
  const createModalVisible = ref(false)
  const todayLogs = ref<WorkLog[]>([])

  const logCount = computed(() => workLogs.value.length)

  /** 加载所有日志 */
  async function loadAll() {
    loading.value = true
    try {
      workLogs.value = await services.workLog.getAllWorkLogs()
    } finally {
      loading.value = false
    }
  }

  /** 加载今日日志 */
  async function loadToday() {
    const today = todayLocal()
    todayLogs.value = await services.workLog.getByDate(today)
  }

  /** 创建日志 */
  async function createWorkLog(input: {
    title: string
    content?: string
    result?: string
    background?: string
    process?: string
    solution?: string
    remainingIssues?: string
    startedAt?: string | null
    endedAt?: string | null
    detailType?: WorkLogDetailType
    projectId?: string | null
    categoryId?: string | null
    taskIds?: string[]
  }): Promise<WorkLog> {
    const log = await services.workLog.createWorkLog(input)
    workLogs.value.unshift(log)
    todayLogs.value.unshift(log)
    return log
  }

  /** 快速创建 */
  async function quickCreate(title: string): Promise<WorkLog> {
    const log = await services.workLog.quickCreate(title)
    workLogs.value.unshift(log)
    todayLogs.value.unshift(log)
    return log
  }

  /** 更新 */
  async function updateWorkLog(id: string, patch: Partial<WorkLog> & { taskIds?: string[] }): Promise<WorkLog> {
    const updated = await services.workLog.updateWorkLog(id, patch)
    const index = workLogs.value.findIndex((l) => l.id === id)
    if (index >= 0) workLogs.value[index] = updated
    const todayIndex = todayLogs.value.findIndex((l) => l.id === id)
    if (todayIndex >= 0) todayLogs.value[todayIndex] = updated
    return updated
  }

  /** 删除 */
  async function deleteWorkLog(id: string): Promise<void> {
    await services.workLog.deleteWorkLog(id)
    const index = workLogs.value.findIndex((l) => l.id === id)
    if (index >= 0) workLogs.value.splice(index, 1)
    const todayIndex = todayLogs.value.findIndex((l) => l.id === id)
    if (todayIndex >= 0) todayLogs.value.splice(todayIndex, 1)
  }

  /** 搜索 */
  async function search(keyword: string): Promise<WorkLog[]> {
    return services.workLog.search(keyword)
  }

  /** 获取日志关联的任务 */
  async function getLinkedTaskIds(logId: string): Promise<string[]> {
    return services.workLog.getTaskIdsByWorkLog(logId)
  }

  /** 获取任务关联的日志 */
  async function getLogsByTask(taskId: string): Promise<WorkLog[]> {
    return services.workLog.getWorkLogsByTask(taskId)
  }

  return {
    workLogs,
    loading,
    createModalVisible,
    todayLogs,
    logCount,
    loadAll,
    loadToday,
    createWorkLog,
    quickCreate,
    updateWorkLog,
    deleteWorkLog,
    search,
    getLinkedTaskIds,
    getLogsByTask,
  }
})
