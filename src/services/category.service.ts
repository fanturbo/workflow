/**
 * 分类服务
 */

import { getRepositories } from '@/db/repositories'
import { getDB, CURRENT_USER_ID } from '@/db/database'
import type { Category } from '@/types'

export class CategoryService {
  async createCategory(input: { name: string; color?: string; icon?: string }): Promise<Category> {
    const repos = getRepositories()
    const categories = await repos.categories.getAll()
    return repos.categories.create({
      userId: CURRENT_USER_ID,
      name: input.name,
      color: input.color ?? '#64748B',
      icon: input.icon ?? 'dots',
      sortOrder: categories.length,
    })
  }

  async updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
    const repos = getRepositories()
    delete (patch as Partial<Category>).id
    delete (patch as Partial<Category>).createdAt
    delete (patch as Partial<Category>).userId
    return repos.categories.update(id, patch)
  }

  async deleteCategory(id: string): Promise<void> {
    const db = getDB()
    await db.transaction('rw', [db.tasks, db.workLogs, db.recurrences, db.categories], async () => {
      await db.tasks.where('categoryId').equals(id).modify({ categoryId: null })
      await db.workLogs.where('categoryId').equals(id).modify({ categoryId: null })
      await db.recurrences.filter(rule => rule.categoryId === id).modify({ categoryId: null })
      await db.categories.delete(id)
    })
  }

  async getCategory(id: string): Promise<Category | null> {
    return getRepositories().categories.getById(id)
  }

  async getAllCategories(): Promise<Category[]> {
    return getRepositories().categories.getAll()
  }

  async getByName(name: string): Promise<Category | null> {
    return getRepositories().categories.getByName(name)
  }

  async updateSortOrder(id: string, sortOrder: number): Promise<void> {
    await getRepositories().categories.update(id, { sortOrder })
  }
}
