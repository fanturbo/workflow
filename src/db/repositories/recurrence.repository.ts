/**
 * 周期任务规则仓储实现
 */

import type { Recurrence } from '@/types'
import { BaseRepository } from './base.repository'
import type { IRecurrenceRepository } from './interfaces'
import { getDB, CURRENT_USER_ID } from '../database'

export class RecurrenceRepository extends BaseRepository<Recurrence> implements IRecurrenceRepository {
  constructor() {
    super(getDB().recurrences)
  }

  async getAll(): Promise<Recurrence[]> {
    return this.table
      .where('userId')
      .equals(CURRENT_USER_ID)
      .sortBy('createdAt')
  }

  async getEnabled(): Promise<Recurrence[]> {
    return this.table
      .filter((r) => r.userId === CURRENT_USER_ID && r.enabled)
      .toArray()
  }
}
