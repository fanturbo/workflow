/**
 * 任务历史仓储实现
 */

import type { TaskHistory } from '@/types'
import { BaseRepository } from './base.repository'
import type { ITaskHistoryRepository } from './interfaces'
import { getDB } from '../database'

export class TaskHistoryRepository extends BaseRepository<TaskHistory> implements ITaskHistoryRepository {
  constructor() {
    super(getDB().taskHistories)
  }

  async getByTask(taskId: string): Promise<TaskHistory[]> {
    return this.table
      .where('taskId')
      .equals(taskId)
      .reverse()
      .sortBy('createdAt')
  }
}
