/**
 * 基础仓储实现 - 基于 Dexie (IndexedDB)
 */

import type { Table } from 'dexie'
import { uuid } from '@/utils'
import { nowUtc } from '@/utils/date'
import type { IBaseRepository } from './interfaces'

export abstract class BaseRepository<T extends { id: string }>
  implements IBaseRepository<T>
{
  protected constructor(
    protected table: Table<T, string>,
  ) {}

  async getById(id: string): Promise<T | null> {
    const result = await this.table.get(id)
    return result ?? null
  }

  async getAll(): Promise<T[]> {
    return this.table.toArray()
  }

  async create(entity: Partial<T>): Promise<T> {
    const now = nowUtc()
    const base = { ...entity } as Record<string, unknown>
    if (!base.id) base.id = uuid()
    if (!base.createdAt) base.createdAt = now
    if (!base.updatedAt) base.updatedAt = now
    const record = base as unknown as T
    await this.table.put(record)
    return record
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const existing = await this.table.get(id)
    if (!existing) {
      throw new Error(`Entity not found: ${id}`)
    }
    const updated = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: nowUtc(),
    } as T
    await this.table.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id)
  }

  async bulkCreate(entities: T[]): Promise<void> {
    await this.table.bulkPut(entities)
  }

  async bulkUpdate(ids: string[], patch: Partial<T>): Promise<void> {
    const entities = await this.table.bulkGet(ids)
    const now = nowUtc()
    const updates = entities.map((e) => {
      if (!e) return null
      return { ...e, ...patch, updatedAt: now } as T
    }).filter(Boolean) as T[]
    await this.table.bulkPut(updates)
  }

  async clear(): Promise<void> {
    await this.table.clear()
  }
}
