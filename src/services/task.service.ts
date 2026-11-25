/**
 * 任务服务 - 核心业务逻辑
 */

import { getRepositories } from '@/db/repositories'
import { getDB, CURRENT_USER_ID } from '@/db/database'
import type { Task, TaskFilter, PageParams, PageResult, TaskPriority, TaskStatus } from '@/types'
import { uuid } from '@/utils'
import { nowUtc, toUtc } from '@/utils/date'

export class TaskService {
  /** 创建任务 */
  async createTask(input: {
    title: string
    description?: string
    priority?: TaskPriority
    status?: TaskStatus
    scheduledDate?: string | null
    dueDate?: string | null
    projectId?: string | null
    categoryId?: string | null
    source?: Task['source']
    parentId?: string | null
    remindAt?: string | null
  }): Promise<Task> {
    const repos = getRepositories()
    const maxSort = await repos.tasks.getByMaxSortOrder()

    return repos.tasks.create({
      userId: CURRENT_USER_ID,
      title: input.title,
      description: input.description ?? '',
      priority: input.priority ?? 'P2',
      status: input.status ?? 'todo',
      scheduledDate: input.scheduledDate ? toUtc(input.scheduledDate) : null,
      dueDate: input.dueDate ? toUtc(input.dueDate) : null,
      projectId: input.projectId ?? null,
      categoryId: input.categoryId ?? null,
      source: input.source ?? 'manual',
      parentId: input.parentId ?? null,
      recurrenceId: null,
      remindAt: input.remindAt ? toUtc(input.remindAt) : null,
      remindedAt: null,
      reminderAckedAt: null,
      reminderSnoozeUntil: null,
      lastRemindedAt: null,
      sortOrder: maxSort + 1,
      completedAt: input.status === 'completed' ? nowUtc() : null,
      archivedAt: null,
    })
  }

  /** 快速新增任务（仅需标题，默认待处理、无计划日期） */
  async quickCreate(title: string, source: Task['source'] = 'manual'): Promise<Task> {
    return this.createTask({ title, source, status: 'todo' })
  }

  /** 更新任务 */
  async updateTask(id: string, patch: Partial<Task>, reason?: string): Promise<Task> {
    const repos = getRepositories()
    const updatePatch: Partial<Task> = { ...patch }

    // 日期字段转为 UTC
    if (patch.scheduledDate !== undefined) {
      updatePatch.scheduledDate = patch.scheduledDate ? toUtc(patch.scheduledDate) : null
    }
    if (patch.dueDate !== undefined) {
      updatePatch.dueDate = patch.dueDate ? toUtc(patch.dueDate) : null
    }
    if (patch.remindAt !== undefined) {
      updatePatch.remindAt = patch.remindAt ? toUtc(patch.remindAt) : null
    }

    // 清除不允许更新的字段
    delete updatePatch.id
    delete updatePatch.createdAt
    delete updatePatch.userId

    const db = getDB()
    return db.transaction('rw', db.tasks, db.taskHistories, async () => {
      const task = await repos.tasks.getById(id)
      if (!task) throw new Error('任务不存在')
      if (updatePatch.scheduledDate !== undefined && task.scheduledDate !== updatePatch.scheduledDate) {
        await this.recordHistory(id, 'reschedule', 'scheduledDate', task.scheduledDate, updatePatch.scheduledDate, reason)
      }
      if (updatePatch.dueDate !== undefined && task.dueDate !== updatePatch.dueDate) {
        await this.recordHistory(id, 'change_due_date', 'dueDate', task.dueDate, updatePatch.dueDate)
      }
      if (updatePatch.remindAt !== undefined && (task.remindAt ?? null) !== updatePatch.remindAt) {
        // 提醒时间变化后重置整条提醒状态，保证新时间仍会重新弹出并响铃
        updatePatch.remindedAt = null
        updatePatch.reminderAckedAt = null
        updatePatch.reminderSnoozeUntil = null
        updatePatch.lastRemindedAt = null
        await this.recordHistory(id, 'change_reminder', 'remindAt', task.remindAt ?? null, updatePatch.remindAt)
      }
      if (updatePatch.status && task.status !== updatePatch.status) {
        const completed = updatePatch.status === 'completed'
        updatePatch.completedAt = completed ? nowUtc() : null
        const action = completed ? 'complete' : task.status === 'completed' ? 'reopen' : 'change_status'
        await this.recordHistory(id, action, 'status', task.status, updatePatch.status)
      }
      return repos.tasks.update(id, updatePatch)
    })
  }

  /** 删除任务（软删除 - 归档） */
  async deleteTask(id: string): Promise<void> {
    const repos = getRepositories()
    await repos.tasks.update(id, { archivedAt: nowUtc() })
    await this.recordHistory(id, 'delete', null, null, null)
  }

  /** 永久删除任务 */
  async permanentDelete(id: string): Promise<void> {
    const repos = getRepositories()
    await repos.tasks.delete(id)
    await repos.taskHistories.delete(id)
    // 清除关联
    await repos.workLogTasks.unlinkByTask(id)
  }

  /** 完成任务 */
  async completeTask(id: string): Promise<Task> {
    return this.updateTask(id, { status: 'completed' })
  }

  /** 重新打开任务 */
  async reopenTask(id: string): Promise<Task> {
    return this.updateTask(id, { status: 'todo' })
  }

  /** 取消任务 */
  async cancelTask(id: string): Promise<Task> {
    return this.updateTask(id, { status: 'cancelled' })
  }

  /** 搁置任务 */
  async holdTask(id: string): Promise<Task> {
    return this.updateTask(id, { status: 'on_hold' })
  }

  /** 延期任务（调整计划日期） */
  async rescheduleTask(id: string, newDate: string, reason?: string): Promise<Task> {
    return this.updateTask(id, { scheduledDate: newDate }, reason)
  }

  /** 移至明天 */
  async moveToTomorrow(id: string): Promise<Task> {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return this.rescheduleTask(id, tomorrow.toISOString())
  }

  /** 移至今天 */
  async moveToToday(id: string): Promise<Task> {
    return this.rescheduleTask(id, new Date().toISOString())
  }

  /** 移至本周某日 */
  async moveToThisWeek(id: string, date: string): Promise<Task> {
    return this.rescheduleTask(id, date)
  }

  /** 归档任务 */
  async archiveTask(id: string): Promise<Task> {
    const repos = getRepositories()
    return repos.tasks.update(id, { archivedAt: nowUtc() })
  }

  async getArchivedTasks(): Promise<Task[]> {
    const tasks = await getRepositories().tasks.getAll()
    return tasks.filter(task => task.userId === CURRENT_USER_ID && task.archivedAt)
  }

  /** 恢复归档任务 */
  async unarchiveTask(id: string): Promise<Task> {
    const repos = getRepositories()
    return repos.tasks.update(id, { archivedAt: null })
  }

  /** 获取任务详情 */
  async getTask(id: string): Promise<Task | null> {
    return getRepositories().tasks.getById(id)
  }

  /** 获取所有任务（排除已归档） */
  async getAllTasks(): Promise<Task[]> {
    const all = await getRepositories().tasks.getAll()
    return all.filter((t) => !t.archivedAt)
  }

  /** 获取任务列表（筛选+分页） */
  async getTasks(filter: TaskFilter, params: PageParams): Promise<PageResult<Task>> {
    return getRepositories().tasks.paginate(filter, params)
  }

  /** 按状态获取任务 */
  async getByStatus(status: TaskStatus): Promise<Task[]> {
    return getRepositories().tasks.getByStatus(status)
  }

  /** 按日期获取任务 */
  async getByDate(date: string): Promise<Task[]> {
    return getRepositories().tasks.getByScheduledDate(date)
  }

  /** 批量更新任务字段（统一走 updateTask，保留历史记录） */
  async batchUpdateTasks(ids: string[], patch: Partial<Task>): Promise<void> {
    const db = getDB()
    await db.transaction('rw', db.tasks, db.taskHistories, async () => {
      for (const id of ids) await this.updateTask(id, patch)
    })
  }

  /** 批量更新状态 */
  async batchUpdateStatus(ids: string[], status: TaskStatus): Promise<void> {
    return this.batchUpdateTasks(ids, { status })
  }

  /** 批量更新计划日期 */
  async batchUpdateScheduledDate(ids: string[], date: string): Promise<void> {
    return this.batchUpdateTasks(ids, { scheduledDate: date })
  }

  /** 批量归档 */
  async batchArchive(ids: string[]): Promise<void> {
    const repos = getRepositories()
    const now = nowUtc()
    await repos.tasks.bulkUpdate(ids, { archivedAt: now })
  }

  /** 批量恢复归档 */
  async batchUnarchive(ids: string[]): Promise<void> {
    const repos = getRepositories()
    await repos.tasks.bulkUpdate(ids, { archivedAt: null })
  }

  /** 获取工作台区块数据 */
  async getDashboardBlockTasks(blockType: string): Promise<Task[]> {
    const repos = getRepositories().tasks
    switch (blockType) {
      case 'must_finish_today':
        return repos.getMustFinishToday()
      case 'this_week':
        return repos.getThisWeek()
      case 'long_term':
        return repos.getLongTerm()
      case 'daily_routine':
        return repos.getDailyRoutine()
      default:
        return []
    }
  }

  /** 更新排序 */
  async updateSortOrder(id: string, sortOrder: number): Promise<void> {
    await getRepositories().tasks.update(id, { sortOrder })
  }

  /** 记录历史 */
  private async recordHistory(
    taskId: string,
    action: string,
    field: string | null,
    oldValue: string | null,
    newValue: string | null,
    reason: string | null = null,
  ): Promise<void> {
    const repos = getRepositories()
    await repos.taskHistories.create({
      id: uuid(),
      taskId,
      userId: CURRENT_USER_ID,
      action,
      field,
      oldValue,
      newValue,
      reason,
    } as Omit<import('@/types').TaskHistory, 'createdAt' | 'updatedAt'>)
  }

  /** 获取任务历史 */
  async getTaskHistory(taskId: string): Promise<import('@/types').TaskHistory[]> {
    return getRepositories().taskHistories.getByTask(taskId)
  }
}
