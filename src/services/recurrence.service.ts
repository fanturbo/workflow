/**
 * 周期任务服务
 * 负责周期规则管理和任务实例生成
 */

import { getRepositories } from '@/db/repositories'
import { getDB, CURRENT_USER_ID } from '@/db/database'
import type { Recurrence, RecurrenceFrequency, Task } from '@/types'
import { nowUtc, toUtc, dayjs, isWorkday, todayLocal } from '@/utils/date'

export class RecurrenceService {
  /** 创建周期规则 */
  async createRecurrence(input: {
    title: string
    description?: string
    priority?: Recurrence['priority']
    projectId?: string | null
    categoryId?: string | null
    frequency: RecurrenceFrequency
    interval?: number
    weekdays?: number[]
    monthDay?: number | null
    startDate: string
    endDate?: string | null
    remindTime?: string | null
  }): Promise<Recurrence> {
    const repos = getRepositories()
    return repos.recurrences.create({
      userId: CURRENT_USER_ID,
      title: input.title,
      description: input.description ?? '',
      priority: input.priority ?? 'P2',
      projectId: input.projectId ?? null,
      categoryId: input.categoryId ?? null,
      frequency: input.frequency,
      interval: input.interval ?? 1,
      weekdays: input.weekdays ?? [],
      monthDay: input.monthDay ?? null,
      startDate: toUtc(input.startDate) ?? nowUtc(),
      endDate: input.endDate ? toUtc(input.endDate) : null,
      remindTime: input.remindTime ?? null,
      enabled: true,
    })
  }

  /** 更新周期规则 */
  async updateRecurrence(id: string, patch: Partial<Recurrence>): Promise<Recurrence> {
    const repos = getRepositories()
    delete (patch as Partial<Recurrence>).id
    delete (patch as Partial<Recurrence>).createdAt
    delete (patch as Partial<Recurrence>).userId
    return repos.recurrences.update(id, patch)
  }

  /** 删除周期规则 */
  async deleteRecurrence(id: string): Promise<void> {
    const db = getDB()
    await db.transaction('rw', db.tasks, db.recurrences, async () => {
      await db.tasks.where('recurrenceId').equals(id).modify({ recurrenceId: null })
      await db.recurrences.delete(id)
    })
  }

  /** 获取所有周期规则 */
  async getAllRecurrences(): Promise<Recurrence[]> {
    return getRepositories().recurrences.getAll()
  }

  /** 启用/禁用 */
  async toggleEnabled(id: string, enabled: boolean): Promise<Recurrence> {
    return getRepositories().recurrences.update(id, { enabled })
  }

  /**
   * 生成今天的周期任务实例
   * 使用唯一规则防止重复生成
   */
  async generateTodayTasks(): Promise<Task[]> {
    const db = getDB()
    return db.transaction('rw', db.tasks, db.recurrences, async () => await this.generateDueRules())
  }

  private async generateDueRules(): Promise<Task[]> {
    const repos = getRepositories()
    const recurrences = await repos.recurrences.getEnabled()
    const today = todayLocal()
    const generated: Task[] = []

    for (const rule of recurrences) {
      // 检查是否在有效范围内
      const ruleStart = dayjs.utc(rule.startDate).local().format('YYYY-MM-DD')
      if (dayjs(today).isBefore(ruleStart)) continue
      if (rule.endDate && dayjs(today).isAfter(dayjs.utc(rule.endDate).local().format('YYYY-MM-DD'))) continue

      // 检查今天是否应该生成
      if (!this.shouldGenerateToday(rule, today)) continue

      // 检查今天是否已生成过（防重复）
      const existing = await this.checkAlreadyGenerated(rule.id, today)
      if (existing) continue

      // 生成任务实例
      const task = await this.createTaskInstance(rule, today)
      generated.push(task)
    }

    return generated
  }

  /** 检查今天是否应该生成任务 */
  private shouldGenerateToday(rule: Recurrence, date: string): boolean {
    const d = dayjs(date)
    const dayOfWeek = d.day()
    // startDate 是 UTC ISO 字符串，需要转为本地日期再做天数差计算
    const startLocal = dayjs.utc(rule.startDate).local().startOf('day')

    switch (rule.frequency) {
      case 'daily':
        return d.startOf('day').diff(startLocal, 'day') % rule.interval === 0

      case 'weekly':
        if (rule.weekdays.length === 0) return false
        return (
          d.startOf('isoWeek').diff(startLocal.startOf('isoWeek'), 'week') % rule.interval === 0 &&
          rule.weekdays.includes(dayOfWeek)
        )

      case 'monthly': {
        if (d.startOf('month').diff(startLocal.startOf('month'), 'month') % rule.interval !== 0) {
          return false
        }
        // 小月钳位：目标日超过当月天数时取当月最后一天，避免 31 号规则在小月整月不生成
        const targetDay = Math.min(rule.monthDay ?? 1, d.daysInMonth())
        return d.date() === targetDay
      }

      case 'workday':
        return isWorkday(date)

      case 'custom':
        return d.startOf('day').diff(startLocal, 'day') % rule.interval === 0

      default:
        return false
    }
  }

  /** 检查今天是否已生成 */
  private async checkAlreadyGenerated(recurrenceId: string, date: string): Promise<boolean> {
    const tasks = await getRepositories().tasks.getByRecurrence(recurrenceId)
    return tasks.some(task => (task.occurrenceDate ?? dayjs(task.createdAt).format('YYYY-MM-DD')) === date)
  }

  /** 创建任务实例 */
  private async createTaskInstance(rule: Recurrence, date: string): Promise<Task> {
    const repos = getRepositories()
    const maxSort = await repos.tasks.getByMaxSortOrder()
    const remindAt = rule.remindTime ? toUtc(dayjs(`${date} ${rule.remindTime}`).toDate()) : null
    // 当天提醒时间已过（例如下午才创建「每天 09:30」规则）视为已确认，避免立刻补弹
    const pastDue = !!remindAt && new Date(remindAt).getTime() <= Date.now()
    const remindedAt = pastDue ? nowUtc() : null
    const reminderAckedAt = pastDue ? nowUtc() : null
    return repos.tasks.create({
      userId: CURRENT_USER_ID,
      title: rule.title,
      description: rule.description,
      priority: rule.priority,
      status: 'todo',
      scheduledDate: toUtc(date),
      dueDate: null,
      projectId: rule.projectId,
      categoryId: rule.categoryId,
      source: 'recurrence',
      parentId: null,
      recurrenceId: rule.id,
      occurrenceDate: date,
      remindAt,
      remindedAt,
      reminderAckedAt,
      sortOrder: maxSort + 1,
      completedAt: null,
      archivedAt: null,
    })
  }

  /** 获取某周期规则的所有实例 */
  async getInstances(recurrenceId: string): Promise<Task[]> {
    return getRepositories().tasks.getByRecurrence(recurrenceId)
  }
}
