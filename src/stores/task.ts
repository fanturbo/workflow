/**
 * 任务状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useServices } from '@/services'
import type { Task, TaskPriority, TaskStatus } from '@/types'
import { ACTIVE_STATUSES } from '@/constants/task'

export const useTaskStore = defineStore('task', () => {
  const services = useServices()

  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const currentTask = ref<Task | null>(null)
  const detailVisible = ref(false)
  const createModalVisible = ref(false)

  const activeTasks = computed(() => tasks.value.filter((t) => ACTIVE_STATUSES.includes(t.status) && !t.archivedAt))
  const completedTasks = computed(() => tasks.value.filter((t) => t.status === 'completed' && !t.archivedAt))

  /** 加载所有任务 */
  async function loadAll() {
    loading.value = true
    try {
      tasks.value = await services.task.getAllTasks()
    } finally {
      loading.value = false
    }
  }

  /** 创建任务 */
  async function createTask(input: {
    title: string
    description?: string
    priority?: TaskPriority
    status?: TaskStatus
    scheduledDate?: string | null
    dueDate?: string | null
    projectId?: string | null
    categoryId?: string | null
    remindAt?: string | null
  }): Promise<Task> {
    const task = await services.task.createTask(input)
    tasks.value.unshift(task)
    return task
  }

  /** 快速创建 */
  async function quickCreate(title: string): Promise<Task> {
    const task = await services.task.quickCreate(title)
    tasks.value.unshift(task)
    return task
  }

  /** 更新任务 */
  async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
    const updated = await services.task.updateTask(id, patch)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) {
      tasks.value[index] = updated
    }
    if (currentTask.value?.id === id) {
      currentTask.value = updated
    }
    return updated
  }

  /** 完成任务 */
  async function completeTask(id: string): Promise<void> {
    const updated = await services.task.completeTask(id)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) tasks.value[index] = updated
    if (currentTask.value?.id === id) currentTask.value = updated
  }

  /** 重新打开 */
  async function reopenTask(id: string): Promise<void> {
    const updated = await services.task.reopenTask(id)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) tasks.value[index] = updated
    if (currentTask.value?.id === id) currentTask.value = updated
  }

  /** 取消任务 */
  async function cancelTask(id: string): Promise<void> {
    const updated = await services.task.cancelTask(id)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) tasks.value[index] = updated
    if (currentTask.value?.id === id) currentTask.value = updated
  }

  /** 搁置任务 */
  async function holdTask(id: string): Promise<void> {
    const updated = await services.task.holdTask(id)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) tasks.value[index] = updated
    if (currentTask.value?.id === id) currentTask.value = updated
  }

  /** 延期 */
  async function rescheduleTask(id: string, newDate: string, reason?: string): Promise<void> {
    const updated = await services.task.rescheduleTask(id, newDate, reason)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) tasks.value[index] = updated
    if (currentTask.value?.id === id) currentTask.value = updated
  }

  /** 移至明天 */
  async function moveToTomorrow(id: string): Promise<void> {
    const updated = await services.task.moveToTomorrow(id)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) tasks.value[index] = updated
    if (currentTask.value?.id === id) currentTask.value = updated
  }

  /** 移至今天 */
  async function moveToToday(id: string): Promise<void> {
    const updated = await services.task.moveToToday(id)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) tasks.value[index] = updated
    if (currentTask.value?.id === id) currentTask.value = updated
  }

  /** 删除（归档） */
  async function deleteTask(id: string): Promise<void> {
    await services.task.deleteTask(id)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) tasks.value.splice(index, 1)
    if (currentTask.value?.id === id) {
      currentTask.value = null
      detailVisible.value = false
    }
  }

  /** 获取任务详情 */
  async function getTaskDetail(id: string): Promise<void> {
    currentTask.value = await services.task.getTask(id)
  }

  /** 打开详情侧边栏 */
  function openDetail(task: Task) {
    currentTask.value = task
    detailVisible.value = true
  }

  /** 关闭详情 */
  function closeDetail() {
    detailVisible.value = false
    currentTask.value = null
  }

  /** 批量更新字段 */
  async function batchUpdate(ids: string[], patch: Partial<Task>): Promise<void> {
    await services.task.batchUpdateTasks(ids, patch)
    await loadAll()
  }

  /** 批量更新状态 */
  async function batchUpdateStatus(ids: string[], status: TaskStatus): Promise<void> {
    await batchUpdate(ids, { status })
  }

  /** 批量更新日期 */
  async function batchUpdateDate(ids: string[], date: string): Promise<void> {
    await batchUpdate(ids, { scheduledDate: date })
  }

  /** 批量归档 */
  async function batchArchive(ids: string[]): Promise<void> {
    await services.task.batchArchive(ids)
    await loadAll()
  }

  /** 批量恢复归档 */
  async function batchUnarchive(ids: string[]): Promise<void> {
    await services.task.batchUnarchive(ids)
    await loadAll()
  }

  /** 获取任务关联的日志 */
  async function getTaskWorkLogs(id: string) {
    return services.workLog.getWorkLogsByTask(id)
  }

  /** 获取任务历史 */
  async function getTaskHistory(id: string) {
    return services.task.getTaskHistory(id)
  }

  return {
    tasks,
    loading,
    currentTask,
    detailVisible,
    createModalVisible,
    activeTasks,
    completedTasks,
    loadAll,
    createTask,
    quickCreate,
    updateTask,
    completeTask,
    reopenTask,
    cancelTask,
    holdTask,
    rescheduleTask,
    moveToTomorrow,
    moveToToday,
    deleteTask,
    getTaskDetail,
    openDetail,
    closeDetail,
    batchUpdate,
    batchUpdateStatus,
    batchUpdateDate,
    batchArchive,
    batchUnarchive,
    getTaskWorkLogs,
    getTaskHistory,
  }
})
