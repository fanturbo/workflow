/**
 * WorkFlow 全局类型定义
 */

/** 任务优先级 */
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3'

/** 任务状态 */
export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled'

/** 工作日志详细程度 */
export type WorkLogDetailType = 'quick' | 'standard' | 'detailed'

/** 项目状态 */
export type ProjectStatus = 'active' | 'completed' | 'archived'

/** 周期频率 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'workday' | 'custom'

/** 工作台区块类型 */
export type DashboardBlockType =
  | 'must_finish_today'
  | 'this_week'
  | 'long_term'
  | 'daily_routine'

/** 任务来源 */
export type TaskSource = 'manual' | 'note' | 'recurrence' | 'import'

/** 任务表 */
export interface Task {
  id: string
  userId: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  scheduledDate: string | null
  dueDate: string | null
  projectId: string | null
  categoryId: string | null
  source: TaskSource
  parentId: string | null
  occurrenceDate?: string
  recurrenceId: string | null
  /** 提醒时刻（UTC ISO），null/缺省表示无提醒 */
  remindAt?: string | null
  /** 首次触发时间（UTC ISO），用于「已提醒」展示 */
  remindedAt?: string | null
  /** 手动确认/关闭时间（UTC ISO）；为空表示提醒仍待处理，刷新后继续常驻 */
  reminderAckedAt?: string | null
  /** 稍后提醒到点时间（UTC ISO）；在此之前不弹、不响 */
  reminderSnoozeUntil?: string | null
  /** 最后一次响铃时间（UTC ISO），配合重复间隔控制不重复轰炸 */
  lastRemindedAt?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
  archivedAt: string | null
}

/** 工作日志表 */
export interface WorkLog {
  id: string
  userId: string
  title: string
  content: string
  result: string
  /** 详细记录专用字段 */
  background: string
  process: string
  solution: string
  remainingIssues: string
  startedAt: string | null
  endedAt: string | null
  detailType: WorkLogDetailType
  projectId: string | null
  categoryId: string | null
  createdAt: string
  updatedAt: string
}

/** 工作日志-任务关联表 */
export interface WorkLogTask {
  id: string
  workLogId: string
  taskId: string
}

/** 随记（一句话、想法，不计入工作统计） */
export interface Note {
  id: string
  userId: string
  content: string
  projectId: string | null
  categoryId: string | null
  /** 已转为任务时记录任务 ID */
  convertedTaskId: string | null
  /** 已补全为工作记录时记录日志 ID */
  convertedWorkLogId: string | null
  createdAt: string
  updatedAt: string
}

/** 项目表 */
export interface Project {
  id: string
  userId: string
  name: string
  description: string
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  color: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** 工作分类表 */
export interface Category {
  id: string
  userId: string
  name: string
  color: string
  icon: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** 周期任务规则表 */
export interface Recurrence {
  id: string
  userId: string
  title: string
  description: string
  priority: TaskPriority
  projectId: string | null
  categoryId: string | null
  frequency: RecurrenceFrequency
  interval: number
  /** 周几，0=周日, 1=周一 ... 6=周六 */
  weekdays: number[]
  monthDay: number | null
  startDate: string
  endDate: string | null
  /** 每日提醒时间（本地 HH:mm），生成实例时换算为实例的 remindAt */
  remindTime?: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/** 任务历史记录表 */
export interface TaskHistory {
  id: string
  taskId: string
  userId: string
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  reason: string | null
  createdAt: string
}

/** 用户设置 */
export interface UserSettings {
  id: string
  userId: string
  timezone: string
  theme: 'light' | 'dark'
  dashboardBlocks: DashboardBlockConfig[]
  /** 提醒总开关（缺省视为开启） */
  reminderEnabled?: boolean
  /** 提醒提示音（缺省视为开启） */
  reminderSound?: boolean
  /** 未确认的提醒是否按间隔重复响铃（缺省视为开启） */
  reminderRepeat?: boolean
  /** 重复提醒间隔（秒），缺省 60，可选 30 / 60 / 300 */
  reminderRepeatSec?: number
  createdAt: string
  updatedAt: string
}

/** 工作台区块配置 */
export interface DashboardBlockConfig {
  type: DashboardBlockType
  visible: boolean
  order: number
}

/** 分页参数 */
export interface PageParams {
  page: number
  pageSize: number
}

/** 分页结果 */
export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** 统一 API 返回格式 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 统计概览数据 */
export interface StatisticsOverview {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  todayTasks: number
  todayCompleted: number
  todayOverdue: number
  workLogCount: number
}

/** 每日完成趋势 */
export interface TrendItem {
  date: string
  created: number
  completed: number
}

/** 分类分布 */
export interface CategoryDistribution {
  categoryId: string
  categoryName: string
  color: string
  count: number
}

/** 项目分布 */
export interface ProjectDistribution {
  projectId: string
  projectName: string
  color: string
  count: number
}

/** 优先级分布 */
export interface PriorityDistribution {
  priority: TaskPriority
  count: number
}

/** 复盘统计结果 */
export interface ReviewStatistics {
  range: { start: string; end: string }
  newTaskCount: number
  completedTaskCount: number
  pendingTaskCount: number
  overdueTaskCount: number
  workLogCount: number
  trend: TrendItem[]
  categoryDistribution: CategoryDistribution[]
  projectDistribution: ProjectDistribution[]
  priorityDistribution: PriorityDistribution[]
  completedTasks: Task[]
}

/** 备份数据结构 */
export interface BackupData {
  version: string
  exportedAt: string
  tasks: Task[]
  workLogs: WorkLog[]
  workLogTasks: WorkLogTask[]
  notes: Note[]
  projects: Project[]
  categories: Category[]
  recurrences: Recurrence[]
  taskHistories: TaskHistory[]
  settings: UserSettings | null
}

/** 任务筛选条件 */
export interface TaskFilter {
  keyword?: string
  priority?: TaskPriority | null
  status?: TaskStatus | null
  projectId?: string | null
  categoryId?: string | null
  scheduledDateFrom?: string | null
  scheduledDateTo?: string | null
  dueDateFrom?: string | null
  dueDateTo?: string | null
}
