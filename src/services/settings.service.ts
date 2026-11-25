/**
 * 用户设置服务
 */

import { getRepositories } from '@/db/repositories'
import type { UserSettings, DashboardBlockConfig, DashboardBlockType } from '@/types'
import { DEFAULT_DASHBOARD_BLOCKS } from '@/constants/task'

export class SettingsService {
  async getSettings(): Promise<UserSettings> {
    const repos = getRepositories()
    return repos.settings.getDefault()
  }

  async updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
    const repos = getRepositories()
    const current = await repos.settings.getDefault()
    return repos.settings.save({ ...current, ...patch })
  }

  async updateTheme(theme: 'light' | 'dark'): Promise<UserSettings> {
    return this.updateSettings({ theme })
  }

  async updateTimezone(timezone: string): Promise<UserSettings> {
    return this.updateSettings({ timezone })
  }

  /** 获取工作台区块配置 */
  async getDashboardBlocks(): Promise<DashboardBlockConfig[]> {
    const settings = await this.getSettings()
    const stored = settings.dashboardBlocks
    if (stored && stored.length > 0) {
      // 过滤掉已下线/非法的区块（例如旧数据里的 urgent_temp），
      // 否则 DashboardView 取 DASHBOARD_BLOCK_CONFIGS[type].label 会抛错导致白屏
      const valid = stored
        .filter((b) => b && DEFAULT_DASHBOARD_BLOCKS.includes(b.type))
        .sort((a, b) => a.order - b.order)
        .map((b, index) => ({ ...b, order: index }))
      if (valid.length > 0) {
        // 顺带把清理结果写回，避免脏数据长期留在库里
        if (valid.length !== stored.length) {
          await this.updateSettings({ dashboardBlocks: valid })
        }
        return valid
      }
    }
    // 初始化默认配置
    const defaultBlocks: DashboardBlockConfig[] = DEFAULT_DASHBOARD_BLOCKS.map((type, index) => ({
      type,
      visible: true,
      order: index,
    }))
    await this.updateSettings({ dashboardBlocks: defaultBlocks })
    return defaultBlocks
  }

  /** 更新区块顺序 */
  async updateBlockOrder(types: DashboardBlockType[]): Promise<void> {
    const blocks = await this.getDashboardBlocks()
    const updated = types.map((type, index) => {
      const existing = blocks.find((b) => b.type === type)
      return {
        type,
        visible: existing?.visible ?? true,
        order: index,
      }
    })
    await this.updateSettings({ dashboardBlocks: updated })
  }

  /** 切换区块可见性 */
  async toggleBlockVisible(type: DashboardBlockType, visible: boolean): Promise<void> {
    const blocks = await this.getDashboardBlocks()
    const block = blocks.find((b) => b.type === type)
    if (block) {
      block.visible = visible
      await this.updateSettings({ dashboardBlocks: blocks })
    }
  }
}
