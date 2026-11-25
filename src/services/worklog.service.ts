/**
 * 工作日志服务
 */

import { getRepositories } from '@/db/repositories'
import { CURRENT_USER_ID } from '@/db/database'
import type { WorkLog, WorkLogDetailType } from '@/types'

export class WorkLogService {
  /** 创建工作日志 */
  async createWorkLog(input: {
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
    const repos = getRepositories()

    const log = await repos.workLogs.create({
      userId: CURRENT_USER_ID,
      title: input.title,
      content: input.content ?? '',
      result: input.result ?? '',
      background: input.background ?? '',
      process: input.process ?? '',
      solution: input.solution ?? '',
      remainingIssues: input.remainingIssues ?? '',
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null,
      detailType: input.detailType ?? 'standard',
      projectId: input.projectId ?? null,
      categoryId: input.categoryId ?? null,
    })

    // 关联任务
    if (input.taskIds && input.taskIds.length > 0) {
      for (const taskId of input.taskIds) {
        await repos.workLogTasks.link(log.id, taskId)
      }
    }

    return log
  }

  /** 快速记录 */
  async quickCreate(title: string): Promise<WorkLog> {
    return this.createWorkLog({ title, detailType: 'quick' })
  }

  /** 更新工作日志 */
  async updateWorkLog(id: string, patch: Partial<WorkLog> & { taskIds?: string[] }): Promise<WorkLog> {
    const repos = getRepositories()
    const { taskIds, ...logPatch } = patch

    const updated = await repos.workLogs.update(id, logPatch)

    // 更新关联任务
    if (taskIds !== undefined) {
      await repos.workLogTasks.unlinkByWorkLog(id)
      for (const taskId of taskIds) {
        await repos.workLogTasks.link(id, taskId)
      }
    }

    return updated
  }

  /** 删除工作日志 */
  async deleteWorkLog(id: string): Promise<void> {
    const repos = getRepositories()
    await repos.workLogTasks.unlinkByWorkLog(id)
    await repos.workLogs.delete(id)
  }

  /** 获取日志详情 */
  async getWorkLog(id: string): Promise<WorkLog | null> {
    return getRepositories().workLogs.getById(id)
  }

  /** 获取所有日志 */
  async getAllWorkLogs(): Promise<WorkLog[]> {
    return getRepositories().workLogs.getAll()
  }

  /** 按日期获取日志 */
  async getByDate(date: string): Promise<WorkLog[]> {
    return getRepositories().workLogs.getByDate(date)
  }

  /** 按日期范围获取日志 */
  async getByDateRange(start: string, end: string): Promise<WorkLog[]> {
    return getRepositories().workLogs.getByDateRange(start, end)
  }

  /** 搜索日志 */
  async search(keyword: string): Promise<WorkLog[]> {
    return getRepositories().workLogs.search(keyword)
  }

  /** 关联任务到日志 */
  async linkTasks(workLogId: string, taskIds: string[]): Promise<void> {
    const repos = getRepositories()
    for (const taskId of taskIds) {
      await repos.workLogTasks.link(workLogId, taskId)
    }
  }

  /** 取消关联 */
  async unlinkTask(workLogId: string, taskId: string): Promise<void> {
    await getRepositories().workLogTasks.unlink(workLogId, taskId)
  }

  /** 获取日志关联的任务 ID */
  async getTaskIdsByWorkLog(workLogId: string): Promise<string[]> {
    return getRepositories().workLogTasks.getTaskIdsByWorkLog(workLogId)
  }

  /** 获取任务关联的日志 ID */
  async getWorkLogIdsByTask(taskId: string): Promise<string[]> {
    return getRepositories().workLogTasks.getWorkLogIdsByTask(taskId)
  }

  /** 获取任务关联的日志 */
  async getWorkLogsByTask(taskId: string): Promise<WorkLog[]> {
    const repos = getRepositories()
    const logIds = await repos.workLogTasks.getWorkLogIdsByTask(taskId)
    const logs: WorkLog[] = []
    for (const id of logIds) {
      const log = await repos.workLogs.getById(id)
      if (log) logs.push(log)
    }
    return logs
  }
}
