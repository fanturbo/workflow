/**
 * 随记仓储实现
 */

import type { Note } from '@/types'
import { BaseRepository } from './base.repository'
import type { INoteRepository } from './interfaces'
import { getDB, CURRENT_USER_ID } from '../database'
import { dayjs } from '@/utils/date'

export class NoteRepository extends BaseRepository<Note> implements INoteRepository {
  constructor() {
    super(getDB().notes)
  }

  async getByDate(date: string): Promise<Note[]> {
    const startDate = dayjs(date).startOf('day').toISOString()
    const endDate = dayjs(date).endOf('day').toISOString()
    return this.table
      .where('createdAt')
      .between(startDate, endDate, true, true)
      .and((n) => n.userId === CURRENT_USER_ID)
      .reverse()
      .sortBy('createdAt')
  }

  async getByDateRange(start: string, end: string): Promise<Note[]> {
    const startDate = dayjs(start).startOf('day').toISOString()
    const endDate = dayjs(end).endOf('day').toISOString()
    return this.table
      .where('createdAt')
      .between(startDate, endDate, true, true)
      .and((n) => n.userId === CURRENT_USER_ID)
      .reverse()
      .sortBy('createdAt')
  }

  async search(keyword: string): Promise<Note[]> {
    const kw = keyword.toLowerCase()
    return this.table
      .filter((n) => n.userId === CURRENT_USER_ID && n.content.toLowerCase().includes(kw))
      .reverse()
      .sortBy('createdAt')
  }
}
