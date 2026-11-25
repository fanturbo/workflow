/**
 * 分类仓储实现
 */

import type { Category } from '@/types'
import { BaseRepository } from './base.repository'
import type { ICategoryRepository } from './interfaces'
import { getDB, CURRENT_USER_ID } from '../database'

export class CategoryRepository extends BaseRepository<Category> implements ICategoryRepository {
  constructor() {
    super(getDB().categories)
  }

  async getAll(): Promise<Category[]> {
    return this.table
      .where('userId')
      .equals(CURRENT_USER_ID)
      .sortBy('sortOrder')
  }

  async getByName(name: string): Promise<Category | null> {
    const result = await this.table
      .where('name')
      .equals(name)
      .and((c) => c.userId === CURRENT_USER_ID)
      .first()
    return result ?? null
  }
}
