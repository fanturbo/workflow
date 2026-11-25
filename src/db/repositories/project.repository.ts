/**
 * 项目仓储实现
 */

import type { Project } from '@/types'
import { BaseRepository } from './base.repository'
import type { IProjectRepository } from './interfaces'
import { getDB, CURRENT_USER_ID } from '../database'

export class ProjectRepository extends BaseRepository<Project> implements IProjectRepository {
  constructor() {
    super(getDB().projects)
  }

  async getAll(): Promise<Project[]> {
    return this.table
      .where('userId')
      .equals(CURRENT_USER_ID)
      .sortBy('sortOrder')
  }

  async getByStatus(status: Project['status']): Promise<Project[]> {
    return this.table
      .where('status')
      .equals(status)
      .and((p) => p.userId === CURRENT_USER_ID)
      .sortBy('sortOrder')
  }
}
