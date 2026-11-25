/**
 * 项目服务
 */

import { getRepositories } from '@/db/repositories'
import { getDB, CURRENT_USER_ID } from '@/db/database'
import type { Project, ProjectStatus } from '@/types'

export class ProjectService {
  async createProject(input: {
    name: string
    description?: string
    color?: string
    startDate?: string | null
    endDate?: string | null
  }): Promise<Project> {
    const repos = getRepositories()
    const projects = await repos.projects.getAll()
    return repos.projects.create({
      userId: CURRENT_USER_ID,
      name: input.name,
      description: input.description ?? '',
      status: 'active',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      color: input.color ?? '#4F6EF7',
      sortOrder: projects.length,
    })
  }

  async updateProject(id: string, patch: Partial<Project>): Promise<Project> {
    const repos = getRepositories()
    delete (patch as Partial<Project>).id
    delete (patch as Partial<Project>).createdAt
    delete (patch as Partial<Project>).userId
    return repos.projects.update(id, patch)
  }

  async deleteProject(id: string): Promise<void> {
    const db = getDB()
    await db.transaction('rw', [db.tasks, db.workLogs, db.recurrences, db.projects], async () => {
      await db.tasks.where('projectId').equals(id).modify({ projectId: null })
      await db.workLogs.where('projectId').equals(id).modify({ projectId: null })
      await db.recurrences.filter(rule => rule.projectId === id).modify({ projectId: null })
      await db.projects.delete(id)
    })
  }

  async getProject(id: string): Promise<Project | null> {
    return getRepositories().projects.getById(id)
  }

  async getAllProjects(): Promise<Project[]> {
    return getRepositories().projects.getAll()
  }

  async getByStatus(status: ProjectStatus): Promise<Project[]> {
    return getRepositories().projects.getByStatus(status)
  }

  async updateSortOrder(id: string, sortOrder: number): Promise<void> {
    await getRepositories().projects.update(id, { sortOrder })
  }
}
