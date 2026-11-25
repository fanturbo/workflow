/**
 * 用户设置仓储实现
 */

import type { UserSettings, DashboardBlockConfig } from '@/types'
import type { ISettingsRepository } from './interfaces'
import { getDB, CURRENT_USER_ID } from '../database'
import { uuid } from '@/utils'
import { nowUtc } from '@/utils/date'
import { DEFAULT_DASHBOARD_BLOCKS } from '@/constants/task'

export class SettingsRepository implements ISettingsRepository {
  async getByUserId(userId: string): Promise<UserSettings | null> {
    const result = await getDB().settings.where('userId').equals(userId).first()
    return result ?? null
  }

  async save(settings: UserSettings): Promise<UserSettings> {
    const existing = await this.getByUserId(settings.userId)
    const now = nowUtc()
    if (existing) {
      const updated: UserSettings = {
        ...existing,
        ...settings,
        id: existing.id,
        userId: existing.userId,
        updatedAt: now,
      }
      await getDB().settings.put(updated)
      return updated
    } else {
      const record: UserSettings = {
        ...settings,
        id: settings.id ?? uuid(),
        updatedAt: now,
        createdAt: settings.createdAt ?? now,
      }
      await getDB().settings.put(record)
      return record
    }
  }

  /** 获取默认用户设置 */
  async getDefault(): Promise<UserSettings> {
    const existing = await this.getByUserId(CURRENT_USER_ID)
    if (existing) return existing

    const now = nowUtc()
    const defaultBlocks: DashboardBlockConfig[] = DEFAULT_DASHBOARD_BLOCKS.map((type, index) => ({
      type,
      visible: true,
      order: index,
    }))

    const settings: UserSettings = {
      id: uuid(),
      userId: CURRENT_USER_ID,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
      theme: 'light',
      dashboardBlocks: defaultBlocks,
      createdAt: now,
      updatedAt: now,
    }

    await getDB().settings.put(settings)
    return settings
  }
}
