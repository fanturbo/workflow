/**
 * 工作日志-任务关联仓储实现
 */

import type { WorkLogTask } from '@/types'
import { BaseRepository } from './base.repository'
import type { IWorkLogTaskRepository } from './interfaces'
import { getDB } from '../database'
import { uuid } from '@/utils'

export class WorkLogTaskRepository extends BaseRepository<WorkLogTask> implements IWorkLogTaskRepository {
  constructor() {
    super(getDB().workLogTasks)
  }

  async getByWorkLog(workLogId: string): Promise<WorkLogTask[]> {
    return this.table.where('workLogId').equals(workLogId).toArray()
  }

  async getByTask(taskId: string): Promise<WorkLogTask[]> {
    return this.table.where('taskId').equals(taskId).toArray()
  }

  async link(workLogId: string, taskId: string): Promise<void> {
    // 检查是否已存在关联
    const existing = await this.table
      .where('workLogId')
      .equals(workLogId)
      .and((r) => r.taskId === taskId)
      .first()
    if (existing) return

    const record: WorkLogTask = {
      id: uuid(),
      workLogId,
      taskId,
    }
    await this.table.put(record)
  }

  async unlink(workLogId: string, taskId: string): Promise<void> {
    const links = await this.table
      .where('workLogId')
      .equals(workLogId)
      .and((r) => r.taskId === taskId)
      .toArray()
    await this.table.bulkDelete(links.map((l) => l.id))
  }

  async unlinkByWorkLog(workLogId: string): Promise<void> {
    const links = await this.table.where('workLogId').equals(workLogId).toArray()
    await this.table.bulkDelete(links.map((l) => l.id))
  }

  async unlinkByTask(taskId: string): Promise<void> {
    const links = await this.table.where('taskId').equals(taskId).toArray()
    await this.table.bulkDelete(links.map((l) => l.id))
  }

  async getTaskIdsByWorkLog(workLogId: string): Promise<string[]> {
    const links = await this.getByWorkLog(workLogId)
    return links.map((l) => l.taskId)
  }

  async getWorkLogIdsByTask(taskId: string): Promise<string[]> {
    const links = await this.getByTask(taskId)
    return links.map((l) => l.workLogId)
  }
}
