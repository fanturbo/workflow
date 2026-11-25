import type { TaskPriority, TaskStatus, DashboardBlockType, WorkLogDetailType, ProjectStatus, RecurrenceFrequency, TaskSource } from '@/types'

/** 任务优先级配置 */
export interface PriorityConfig {
  value: TaskPriority
  label: string
  color: string
  weight: number
}

export const PRIORITY_CONFIGS: Record<TaskPriority, PriorityConfig> = {
  P0: { value: 'P0', label: 'P0 紧急', color: '#DC2626', weight: 0 },
  P1: { value: 'P1', label: 'P1 重要', color: '#D97706', weight: 1 },
  P2: { value: 'P2', label: 'P2 普通', color: '#4F6EF7', weight: 2 },
  P3: { value: 'P3', label: 'P3 低优', color: '#64748B', weight: 3 },
}

export const PRIORITY_LIST: TaskPriority[] = ['P0', 'P1', 'P2', 'P3']

/** 任务状态配置 */
export interface StatusConfig {
  value: TaskStatus
  label: string
  color: string
  type: 'default' | 'info' | 'success' | 'warning' | 'error'
}

export const STATUS_CONFIGS: Record<TaskStatus, StatusConfig> = {
  todo: { value: 'todo', label: '待处理', color: '#4F6EF7', type: 'info' },
  in_progress: { value: 'in_progress', label: '进行中', color: '#D97706', type: 'warning' },
  completed: { value: 'completed', label: '已完成', color: '#16A34A', type: 'success' },
  on_hold: { value: 'on_hold', label: '已搁置', color: '#94A3B8', type: 'default' },
  cancelled: { value: 'cancelled', label: '已取消', color: '#94A3B8', type: 'default' },
}

export const STATUS_LIST: TaskStatus[] = ['todo', 'in_progress', 'completed', 'on_hold', 'cancelled']

/** 进行中的状态 */
export const ACTIVE_STATUSES: TaskStatus[] = ['todo', 'in_progress']

/** 终态状态 */
export const TERMINAL_STATUSES: TaskStatus[] = ['completed', 'cancelled', 'on_hold']

/** 工作台区块配置 */
export interface BlockConfig {
  type: DashboardBlockType
  label: string
  icon: string
  description: string
}

export const DASHBOARD_BLOCK_CONFIGS: Record<DashboardBlockType, BlockConfig> = {
  must_finish_today: {
    type: 'must_finish_today',
    label: '今天要做',
    icon: 'flame',
    description: '今天计划和之前未完成的事项，按优先级排列',
  },
  this_week: {
    type: 'this_week',
    label: '本周需要推进',
    icon: 'calendar',
    description: '本周有计划日期的任务',
  },
  long_term: {
    type: 'long_term',
    label: '长期重要事项',
    icon: 'star',
    description: '需要持续关注的长期任务',
  },
  daily_routine: {
    type: 'daily_routine',
    label: '每日必做',
    icon: 'repeat',
    description: '周期任务生成的当日实例',
  },
}

export const DEFAULT_DASHBOARD_BLOCKS: DashboardBlockType[] = [
  'must_finish_today',
  'this_week',
  'long_term',
  'daily_routine',
]

/** 工作日志类型 */
export const DETAIL_TYPE_CONFIGS: Record<WorkLogDetailType, { value: WorkLogDetailType; label: string; icon: string }> = {
  quick: { value: 'quick', label: '快速记录', icon: 'bolt' },
  standard: { value: 'standard', label: '标准记录', icon: 'document' },
  detailed: { value: 'detailed', label: '详细记录', icon: 'edit' },
}

/** 项目状态 */
export const PROJECT_STATUS_CONFIGS: Record<ProjectStatus, { value: ProjectStatus; label: string }> = {
  active: { value: 'active', label: '进行中' },
  completed: { value: 'completed', label: '已完成' },
  archived: { value: 'archived', label: '已归档' },
}

/** 周期频率 */
export const FREQUENCY_CONFIGS: Record<RecurrenceFrequency, { value: RecurrenceFrequency; label: string }> = {
  daily: { value: 'daily', label: '每天' },
  weekly: { value: 'weekly', label: '每周' },
  monthly: { value: 'monthly', label: '每月' },
  workday: { value: 'workday', label: '工作日' },
  custom: { value: 'custom', label: '自定义' },
}

/** 任务来源 */
export const SOURCE_CONFIGS: Record<TaskSource, { value: TaskSource; label: string }> = {
  manual: { value: 'manual', label: '手动创建' },
  note: { value: 'note', label: '随记转入' },
  recurrence: { value: 'recurrence', label: '周期生成' },
  import: { value: 'import', label: '导入' },
}

/** 默认工作分类 */
export const DEFAULT_CATEGORIES: { name: string; color: string; icon: string }[] = [
  { name: '项目开发', color: '#4F6EF7', icon: 'code' },
  { name: '问题处理', color: '#DC2626', icon: 'bug' },
  { name: '沟通协调', color: '#D97706', icon: 'chat' },
  { name: '会议', color: '#8B5CF6', icon: 'people' },
  { name: '文档整理', color: '#0891B2', icon: 'document' },
  { name: '学习研究', color: '#16A34A', icon: 'book' },
  { name: '其他', color: '#64748B', icon: 'dots' },
]

/** 复盘周期预设 */
export const REVIEW_RANGES = [
  { value: 7, label: '最近 7 天' },
  { value: 14, label: '最近 14 天' },
  { value: 30, label: '最近 30 天' },
  { value: 365, label: '最近 365 天' },
]
