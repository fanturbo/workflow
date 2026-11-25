/**
 * 数据库初始化与演示数据
 */

import { getDB, CURRENT_USER_ID } from './database'
import { getRepositories } from './repositories'
import { DEFAULT_CATEGORIES } from '@/constants/task'
import { uuid } from '@/utils'
import { nowUtc } from '@/utils/date'
import type { Task, WorkLog, Note, Project, Category, Recurrence } from '@/types'

/** 检查数据库是否已初始化 */
export async function isInitialized(): Promise<boolean> {
  const categories = await getDB().categories.count()
  return categories > 0
}

/** 初始化默认分类 */
export async function initDefaultCategories(): Promise<void> {
  const repos = getRepositories()
  const existing = await repos.categories.getAll()
  if (existing.length > 0) return

  const now = nowUtc()
  const categories: Category[] = DEFAULT_CATEGORIES.map((c, index) => ({
    id: uuid(),
    userId: CURRENT_USER_ID,
    name: c.name,
    color: c.color,
    icon: c.icon,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }))

  await repos.categories.bulkCreate(categories)
}

/** 初始化默认项目 */
export async function initDefaultProjects(): Promise<void> {
  const repos = getRepositories()
  const existing = await repos.projects.getAll()
  if (existing.length > 0) return

  const defaults = [
    { name: '日常工作', description: '日常工作事务', color: '#4F46E5', sortOrder: 0 },
    { name: '日常生活', description: '生活琐事与个人事务', color: '#059669', sortOrder: 1 },
  ]
  for (const d of defaults) {
    await repos.projects.create({
      userId: CURRENT_USER_ID,
      name: d.name,
      description: d.description,
      status: 'active',
      startDate: nowUtc(),
      endDate: null,
      color: d.color,
      sortOrder: d.sortOrder,
    } as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>)
  }
}

/** 初始化默认设置 */
export async function initDefaultSettings(): Promise<void> {
  const repos = getRepositories()
  await repos.settings.getDefault()
}

/** 初始化演示数据 */
export async function initDemoData(): Promise<void> {
  const repos = getRepositories()
  const tasks = await repos.tasks.getAll()
  if (tasks.length > 0) return // 已有数据不重复初始化

  await initDefaultCategories()
  await initDefaultProjects()
  await initDefaultSettings()

  const today = new Date()
  const todayStr = today.toISOString()
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
  const dayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
  const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const categories = await repos.categories.getAll()
  const projects = await repos.projects.getAll()
  const devCategory = categories.find((c) => c.name === '项目开发')!
  const bugCategory = categories.find((c) => c.name === '问题处理')!
  const commCategory = categories.find((c) => c.name === '沟通协调')!
  const workProject = projects.find((p) => p.name === '日常工作')!
  const lifeProject = projects.find((p) => p.name === '日常生活')!

  // 创建演示任务
  const demoTasks: Partial<Task>[] = [
    {
      userId: CURRENT_USER_ID,
      title: '完成季度报告初稿',
      description: '整理本季度工作成果，撰写报告框架',
      priority: 'P0',
      status: 'in_progress',
      scheduledDate: todayStr,
      dueDate: todayStr,
      projectId: workProject.id,
      categoryId: devCategory.id,
      source: 'manual',
      parentId: null,
      recurrenceId: null,
      sortOrder: 0,
      completedAt: null,
      archivedAt: null,
    },
    {
      userId: CURRENT_USER_ID,
      title: '修复线上接口超时问题',
      description: '生产环境接口偶发超时，需排查原因',
      priority: 'P1',
      status: 'todo',
      scheduledDate: todayStr,
      dueDate: null,
      projectId: workProject.id,
      categoryId: bugCategory.id,
      source: 'manual',
      parentId: null,
      recurrenceId: null,
      sortOrder: 1,
      completedAt: null,
      archivedAt: null,
    },
    {
      userId: CURRENT_USER_ID,
      title: '给妈妈打个电话',
      priority: 'P2',
      status: 'todo',
      scheduledDate: null,
      dueDate: null,
      projectId: lifeProject.id,
      categoryId: null,
      source: 'note',
      parentId: null,
      recurrenceId: null,
      sortOrder: 2,
      completedAt: null,
      archivedAt: null,
    },
    {
      userId: CURRENT_USER_ID,
      title: '与团队同步项目进度',
      priority: 'P1',
      status: 'todo',
      scheduledDate: dayAfterTomorrow,
      dueDate: null,
      projectId: workProject.id,
      categoryId: commCategory.id,
      source: 'manual',
      parentId: null,
      recurrenceId: null,
      sortOrder: 3,
      completedAt: null,
      archivedAt: null,
    },
    {
      userId: CURRENT_USER_ID,
      title: '预约周末体检',
      priority: 'P2',
      status: 'todo',
      scheduledDate: null,
      dueDate: null,
      projectId: lifeProject.id,
      categoryId: null,
      source: 'manual',
      parentId: null,
      recurrenceId: null,
      sortOrder: 4,
      completedAt: null,
      archivedAt: null,
    },
    {
      userId: CURRENT_USER_ID,
      title: '整理本周会议纪要',
      priority: 'P2',
      status: 'completed',
      scheduledDate: yesterdayStr,
      dueDate: yesterdayStr,
      projectId: workProject.id,
      categoryId: devCategory.id,
      source: 'manual',
      parentId: null,
      recurrenceId: null,
      sortOrder: 5,
      completedAt: new Date(today.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      archivedAt: null,
    },
  ]

  for (const t of demoTasks) {
    await repos.tasks.create(t as Partial<Task>)
  }

  // 创建演示工作日志
  await repos.workLogs.create({
    userId: CURRENT_USER_ID,
    title: '整理季度报告素材',
    content: '梳理本季度主要工作成果，收集数据指标',
    result: '报告素材整理完成，框架已搭建',
    background: '',
    process: '',
    solution: '',
    remainingIssues: '',
    startedAt: new Date(today.getTime() - 8 * 60 * 60 * 1000).toISOString(),
    endedAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    detailType: 'standard',
    projectId: workProject.id,
    categoryId: devCategory.id,
  } as Partial<WorkLog>)

  // 创建演示随记
  await repos.notes.create({
    userId: CURRENT_USER_ID,
    content: '随记和工作记录分开：随手记的一句话或想法不计入复盘统计。',
    projectId: null,
    categoryId: null,
    convertedTaskId: null,
    convertedWorkLogId: null,
  } as Partial<Note>)

  // 创建演示周期任务
  await repos.recurrences.create({
    userId: CURRENT_USER_ID,
    title: '每日站会',
    description: '团队每日站会同步工作进展',
    priority: 'P2',
    projectId: workProject.id,
    categoryId: commCategory.id,
    frequency: 'workday',
    interval: 1,
    weekdays: [],
    monthDay: null,
    startDate: todayStr,
    endDate: null,
    enabled: true,
  } as Partial<Recurrence>)

  void tomorrowStr
}

/** 初始化数据库 */
export async function initDatabase(): Promise<void> {
  await initDefaultCategories()
  await initDefaultProjects()
  await initDefaultSettings()
}

/** 清空所有数据 */
export async function clearAllData(): Promise<void> {
  const db = getDB()
  await db.transaction('rw', [db.tasks, db.workLogs, db.workLogTasks, db.notes, db.projects, db.categories, db.recurrences, db.taskHistories, db.settings], async () => {
    await db.tasks.clear()
    await db.workLogs.clear()
    await db.workLogTasks.clear()
    await db.notes.clear()
    await db.projects.clear()
    await db.categories.clear()
    await db.recurrences.clear()
    await db.taskHistories.clear()
    await db.settings.clear()
  })
}

/** 重置为演示数据 */
export async function resetToDemoData(): Promise<void> {
  await clearAllData()
  await initDemoData()
}
