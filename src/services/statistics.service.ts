/**
 * 统计与复盘服务
 * 所有统计基于真实业务数据，不使用固定假数据
 */

import { getRepositories } from '@/db/repositories'
import type {
  StatisticsOverview,
  ReviewStatistics,
  TrendItem,
  CategoryDistribution,
  ProjectDistribution,
  PriorityDistribution,
  Task,
} from '@/types'
import { ACTIVE_STATUSES, PRIORITY_LIST } from '@/constants/task'
import { dayjs, getDateRange, isPast } from '@/utils/date'

export class StatisticsService {
  /** 获取概览数据 */
  async getOverview(): Promise<StatisticsOverview> {
    const repos = getRepositories()
    const allTasks = await repos.tasks.getAll()
    const activeTasks = allTasks.filter((t) => !t.archivedAt)
    const allLogs = await repos.workLogs.getAll()

    const todayStart = dayjs().startOf('day').toISOString()
    const todayEnd = dayjs().endOf('day').toISOString()

    const todayScheduled = activeTasks.filter((t) => {
      if (!t.scheduledDate) return false
      const d = dayjs.utc(t.scheduledDate).local()
      return d.isBetween(todayStart, todayEnd, undefined, '[]')
    })

    const todayCompleted = activeTasks.filter((t) => {
      if (!t.completedAt) return false
      const d = dayjs.utc(t.completedAt).local()
      return d.isBetween(todayStart, todayEnd, undefined, '[]')
    })

    const todayOverdue = activeTasks.filter((t) => {
      if (!t.dueDate) return false
      return isPast(t.dueDate) && ACTIVE_STATUSES.includes(t.status)
    })

    return {
      totalTasks: activeTasks.filter((t) => t.status !== 'cancelled').length,
      completedTasks: activeTasks.filter((t) => t.status === 'completed').length,
      pendingTasks: activeTasks.filter((t) => ACTIVE_STATUSES.includes(t.status)).length,
      overdueTasks: todayOverdue.length,
      todayTasks: todayScheduled.filter((t) => ACTIVE_STATUSES.includes(t.status)).length,
      todayCompleted: todayCompleted.length,
      todayOverdue: todayOverdue.length,
      workLogCount: allLogs.length,
    }
  }

  /** 获取复盘统计 */
  async getReviewStatistics(rangeStart: string, rangeEnd: string): Promise<ReviewStatistics> {
    const repos = getRepositories()
    const allTasks = await repos.tasks.getAll()
    const allLogs = await repos.workLogs.getAll()
    const history = await repos.taskHistories.getAll()
    const startDate = dayjs(rangeStart).startOf('day')
    const endDate = dayjs(rangeEnd).endOf('day')
    const inRange = (date: string) => dayjs.utc(date).local().isBetween(startDate, endDate, undefined, '[]')
    const tasksInRange = allTasks.filter(task => inRange(task.createdAt))
    const tasksById = new Map(allTasks.map(task => [task.id, task]))
    const recorded = new Set<string>()
    const completedInRange: Task[] = []
    const historicalDue = new Map<string, string | null>()
    const laterStatus = new Map<string, Task['status']>()
    for (const event of history.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const task = tasksById.get(event.taskId)
      if (!task) continue
      if (event.field === 'dueDate' && dayjs(event.createdAt).isAfter(endDate) && !historicalDue.has(task.id)) {
        historicalDue.set(task.id, event.oldValue)
      }
      if (event.field !== 'status') continue
      if (event.oldValue && dayjs(event.createdAt).isAfter(endDate) && !laterStatus.has(task.id)) {
        laterStatus.set(task.id, event.oldValue as Task['status'])
      }
      if (event.newValue !== 'completed') continue
      recorded.add(task.id)
      if (inRange(event.createdAt)) completedInRange.push({ ...task, completedAt: event.createdAt })
    }
    for (const task of allTasks) {
      if (!recorded.has(task.id) && task.completedAt && inRange(task.completedAt)) completedInRange.push(task)
    }
    const pendingTasks = allTasks.filter(task =>
      !dayjs(task.createdAt).isAfter(endDate) &&
      (!task.archivedAt || dayjs(task.archivedAt).isAfter(endDate)) &&
      ACTIVE_STATUSES.includes(laterStatus.get(task.id) ?? task.status),
    )
    const overdueTasks = pendingTasks.filter(task => {
      const dueDate = historicalDue.has(task.id) ? historicalDue.get(task.id) : task.dueDate
      return dueDate && dayjs(dueDate).isBefore(endDate.startOf('day'))
    })

    // 在范围内的日志
    const logsInRange = allLogs.filter((t) => {
      return inRange(t.createdAt)
    })

    // 每日完成趋势
    const trend = this.calculateTrend(rangeStart, rangeEnd, tasksInRange, completedInRange)

    // 分类分布
    const categoryDistribution = await this.calculateCategoryDistribution(completedInRange)

    // 项目分布
    const projectDistribution = await this.calculateProjectDistribution(completedInRange)

    // 优先级分布
    const priorityDistribution = this.calculatePriorityDistribution(completedInRange)

    return {
      range: { start: rangeStart, end: rangeEnd },
      newTaskCount: tasksInRange.length,
      completedTaskCount: completedInRange.length,
      pendingTaskCount: pendingTasks.length,
      overdueTaskCount: overdueTasks.length,
      workLogCount: logsInRange.length,
      trend,
      categoryDistribution,
      projectDistribution,
      priorityDistribution,
      completedTasks: completedInRange,
    }
  }

  /** 计算每日趋势 */
  private calculateTrend(start: string, end: string, tasks: Task[], completions: Task[]): TrendItem[] {
    const dates = getDateRange(start, end)
    return dates.map((date) => {
      const dayStart = dayjs(date).startOf('day')
      const dayEnd = dayjs(date).endOf('day')
      const created = tasks.filter((t) => {
        const d = dayjs.utc(t.createdAt).local()
        return d.isBetween(dayStart, dayEnd, undefined, '[]')
      }).length
      const completed = completions.filter((t) => {
        if (!t.completedAt) return false
        const d = dayjs.utc(t.completedAt).local()
        return d.isBetween(dayStart, dayEnd, undefined, '[]')
      }).length
      return { date, created, completed }
    })
  }

  /** 计算分类分布 */
  private async calculateCategoryDistribution(tasks: Task[]): Promise<CategoryDistribution[]> {
    const repos = getRepositories()
    const categories = await repos.categories.getAll()
    const distribution: Record<string, number> = {}

    for (const task of tasks) {
      const catId = task.categoryId ?? 'uncategorized'
      distribution[catId] = (distribution[catId] ?? 0) + 1
    }

    return Object.entries(distribution).map(([catId, count]) => {
      const cat = categories.find((c) => c.id === catId)
      return {
        categoryId: catId,
        categoryName: cat?.name ?? '未分类',
        color: cat?.color ?? '#64748B',
        count,
      }
    })
  }

  /** 计算项目分布 */
  private async calculateProjectDistribution(tasks: Task[]): Promise<ProjectDistribution[]> {
    const repos = getRepositories()
    const projects = await repos.projects.getAll()
    const distribution: Record<string, number> = {}

    for (const task of tasks) {
      const projId = task.projectId ?? 'unassigned'
      distribution[projId] = (distribution[projId] ?? 0) + 1
    }

    return Object.entries(distribution).map(([projId, count]) => {
      const proj = projects.find((p) => p.id === projId)
      return {
        projectId: projId,
        projectName: proj?.name ?? '未分配',
        color: proj?.color ?? '#64748B',
        count,
      }
    })
  }

  /** 计算优先级分布 */
  private calculatePriorityDistribution(tasks: Task[]): PriorityDistribution[] {
    const distribution: Record<string, number> = {}
    for (const p of PRIORITY_LIST) {
      distribution[p] = 0
    }
    for (const task of tasks) {
      distribution[task.priority] = (distribution[task.priority] ?? 0) + 1
    }
    return PRIORITY_LIST.map((priority) => ({
      priority,
      count: distribution[priority] ?? 0,
    }))
  }
}
