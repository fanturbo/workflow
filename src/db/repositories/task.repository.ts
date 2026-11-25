/**
 * 任务仓储实现
 */

import type { Task, TaskFilter, PageParams, PageResult } from '@/types'
import { BaseRepository } from './base.repository'
import type { ITaskRepository } from './interfaces'
import { getDB, CURRENT_USER_ID } from '../database'
import { ACTIVE_STATUSES } from '@/constants/task'
import { dayjs, isTodayDate, isThisWeek, isPast } from '@/utils/date'

export class TaskRepository extends BaseRepository<Task> implements ITaskRepository {
  constructor() {
    super(getDB().tasks)
  }

  async getByStatus(status: Task['status']): Promise<Task[]> {
    return this.table
      .where('status')
      .equals(status)
      .and((t) => !t.archivedAt && t.userId === CURRENT_USER_ID)
      .sortBy('sortOrder')
  }

  async getByScheduledDate(date: string): Promise<Task[]> {
    const start = dayjs(date).startOf('day').toISOString()
    const end = dayjs(date).endOf('day').toISOString()
    return this.table
      .where('scheduledDate')
      .between(start, end, true, true)
      .and((t) => !t.archivedAt && t.userId === CURRENT_USER_ID)
      .sortBy('sortOrder')
  }

  async getByDateRange(start: string, end: string): Promise<Task[]> {
    const startDate = dayjs(start).startOf('day').toISOString()
    const endDate = dayjs(end).endOf('day').toISOString()
    return this.table
      .where('scheduledDate')
      .between(startDate, endDate, true, true)
      .and((t) => !t.archivedAt && t.userId === CURRENT_USER_ID)
      .sortBy('sortOrder')
  }

  async getByProject(projectId: string): Promise<Task[]> {
    return this.table
      .where('projectId')
      .equals(projectId)
      .and((t) => !t.archivedAt && t.userId === CURRENT_USER_ID)
      .sortBy('sortOrder')
  }

  async getByCategory(categoryId: string): Promise<Task[]> {
    return this.table
      .where('categoryId')
      .equals(categoryId)
      .and((t) => !t.archivedAt && t.userId === CURRENT_USER_ID)
      .sortBy('sortOrder')
  }

  async getByRecurrence(recurrenceId: string): Promise<Task[]> {
    return this.table
      .where('recurrenceId')
      .equals(recurrenceId)
      .and((t) => t.userId === CURRENT_USER_ID)
      .sortBy('createdAt')
  }

  async filter(filter: TaskFilter): Promise<Task[]> {
    let collection = this.table.filter((t) => !t.archivedAt && t.userId === CURRENT_USER_ID)

    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase()
      collection = collection.and(
        (t) => t.title.toLowerCase().includes(kw) || (t.description?.toLowerCase().includes(kw) ?? false),
      )
    }
    if (filter.priority) {
      collection = collection.and((t) => t.priority === filter.priority)
    }
    if (filter.status) {
      collection = collection.and((t) => t.status === filter.status)
    }
    if (filter.projectId) {
      collection = collection.and((t) => t.projectId === filter.projectId)
    }
    if (filter.categoryId) {
      collection = collection.and((t) => t.categoryId === filter.categoryId)
    }

    const results = await collection.sortBy('createdAt')
    return results.reverse()
  }

  async paginate(filter: TaskFilter, params: PageParams): Promise<PageResult<Task>> {
    const all = await this.filter(filter)
    const start = (params.page - 1) * params.pageSize
    const items = all.slice(start, start + params.pageSize)
    return {
      items,
      total: all.length,
      page: params.page,
      pageSize: params.pageSize,
    }
  }

  async countByStatus(status: Task['status']): Promise<number> {
    const tasks = await this.table
      .where('status')
      .equals(status)
      .and((t) => !t.archivedAt && t.userId === CURRENT_USER_ID)
      .count()
    return tasks
  }

  async getByMaxSortOrder(): Promise<number> {
    const all = await this.table.where('userId').equals(CURRENT_USER_ID).toArray()
    if (all.length === 0) return 0
    return Math.max(...all.map((t) => t.sortOrder))
  }

  // === 工作台区块查询 ===

  /** 今天必须完成：scheduledDate 为今天且优先级 P0/P1 */
  async getMustFinishToday(): Promise<Task[]> {
    return this.table
      .filter(
        (t) =>
          !t.archivedAt &&
          t.userId === CURRENT_USER_ID &&
          (isTodayDate(t.scheduledDate) || isPast(t.scheduledDate)) &&
          !(t.recurrenceId && isTodayDate(t.scheduledDate)) &&
          ACTIVE_STATUSES.includes(t.status),
      )
      .sortBy('sortOrder').then(tasks => tasks.sort((a,b) => a.priority.localeCompare(b.priority)))
  }

  /** 本周需要推进：本周有计划日期的任务（排除已完成的和今天 P0/P1 的） */
  async getThisWeek(): Promise<Task[]> {
    return this.table
      .filter(
        (t) =>
          !t.archivedAt &&
          t.userId === CURRENT_USER_ID &&
          ACTIVE_STATUSES.includes(t.status) &&
          isThisWeek(t.scheduledDate) &&
          !isTodayDate(t.scheduledDate) && !isPast(t.scheduledDate),
      )
      .sortBy('scheduledDate')
  }

  /** 长期重要事项：没有近期执行安排，但需要持续关注的任务 */
  async getLongTerm(): Promise<Task[]> {
    return this.table
      .filter(
        (t) =>
          !t.archivedAt &&
          t.userId === CURRENT_USER_ID &&
          ACTIVE_STATUSES.includes(t.status) &&
          (t.scheduledDate === null || (!isThisWeek(t.scheduledDate) && !isPast(t.scheduledDate))),
      )
      .sortBy('sortOrder')
  }

  /** 每日必做：周期任务生成的当天实例 */
  async getDailyRoutine(): Promise<Task[]> {
    return this.table
      .filter(
        (t) =>
          !t.archivedAt &&
          t.userId === CURRENT_USER_ID &&
          t.recurrenceId !== null &&
          isTodayDate(t.scheduledDate) &&
          ACTIVE_STATUSES.includes(t.status),
      )
      .sortBy('sortOrder')
  }

  /** 获取今日逾期任务 */
  async getTodayOverdue(): Promise<Task[]> {
    return this.table
      .filter(
        (t) =>
          !t.archivedAt &&
          t.userId === CURRENT_USER_ID &&
          isPast(t.dueDate) &&
          ACTIVE_STATUSES.includes(t.status),
      )
      .toArray()
  }

  /** 获取今日已完成 */
  async getTodayCompleted(): Promise<Task[]> {
    const todayStart = dayjs().startOf('day').toISOString()
    const todayEnd = dayjs().endOf('day').toISOString()
    return this.table
      .filter(
        (t) =>
          t.userId === CURRENT_USER_ID &&
          t.status === 'completed' &&
          t.completedAt !== null &&
          t.completedAt >= todayStart &&
          t.completedAt <= todayEnd,
      )
      .toArray()
  }
}
