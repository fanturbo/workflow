/**
 * 工作日志仓储实现
 */

import type { WorkLog } from '@/types'
import { BaseRepository } from './base.repository'
import type { IWorkLogRepository } from './interfaces'
import { getDB, CURRENT_USER_ID } from '../database'
import { dayjs } from '@/utils/date'

export class WorkLogRepository extends BaseRepository<WorkLog> implements IWorkLogRepository {
  constructor() {
    super(getDB().workLogs)
  }

  async getByProject(projectId: string): Promise<WorkLog[]> {
    return this.table
      .where('projectId')
      .equals(projectId)
      .and((t) => t.userId === CURRENT_USER_ID)
      .reverse()
      .sortBy('createdAt')
  }

  async getByDateRange(start: string, end: string): Promise<WorkLog[]> {
    const startDate = dayjs(start).startOf('day').toISOString()
    const endDate = dayjs(end).endOf('day').toISOString()
    return this.table
      .where('createdAt')
      .between(startDate, endDate, true, true)
      .and((t) => t.userId === CURRENT_USER_ID)
      .reverse()
      .sortBy('createdAt')
  }

  async getByDate(date: string): Promise<WorkLog[]> {
    const startDate = dayjs(date).startOf('day').toISOString()
    const endDate = dayjs(date).endOf('day').toISOString()
    return this.table
      .where('createdAt')
      .between(startDate, endDate, true, true)
      .and((t) => t.userId === CURRENT_USER_ID)
      .reverse()
      .sortBy('createdAt')
  }

  async search(keyword: string): Promise<WorkLog[]> {
    const kw = keyword.toLowerCase()
    return this.table
      .filter(
        (t) =>
          t.userId === CURRENT_USER_ID &&
          (t.title.toLowerCase().includes(kw) ||
            (t.content?.toLowerCase().includes(kw) ?? false) ||
            (t.result?.toLowerCase().includes(kw) ?? false)),
      )
      .reverse()
      .sortBy('createdAt')
  }
}
