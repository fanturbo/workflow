/**
 * WorkFlow 数据库定义
 * 基于 Dexie (IndexedDB) 的单机 MVP 实现
 * 数据访问层已抽象，后续可替换为 API 服务
 */

import Dexie, { type Table } from 'dexie'
import type {
  Task,
  WorkLog,
  WorkLogTask,
  Note,
  Project,
  Category,
  Recurrence,
  TaskHistory,
  UserSettings,
} from '@/types'

export const DB_NAME = 'workflow_db'
export const DB_VERSION = 5

/** 当前用户 ID（V1.0 单机模式固定值） */
export const CURRENT_USER_ID = 'default-user'

export interface WorkFlowDB extends Dexie {
  tasks: Table<Task, string>
  workLogs: Table<WorkLog, string>
  workLogTasks: Table<WorkLogTask, string>
  notes: Table<Note, string>
  projects: Table<Project, string>
  categories: Table<Category, string>
  recurrences: Table<Recurrence, string>
  taskHistories: Table<TaskHistory, string>
  settings: Table<UserSettings, string>
}

let dbInstance: WorkFlowDB | null = null

/** 获取数据库单例 */
export function getDB(): WorkFlowDB {
  if (dbInstance) return dbInstance

  const db = new Dexie(DB_NAME) as WorkFlowDB

  // v1 schema
  db.version(1).stores({
    tasks: 'id, userId, status, priority, scheduledDate, dueDate, projectId, categoryId, source, parentId, recurrenceId, sortOrder, createdAt, updatedAt, completedAt, archivedAt',
    workLogs: 'id, userId, title, projectId, categoryId, detailType, createdAt, updatedAt',
    workLogTasks: 'id, workLogId, taskId, [workLogId+taskId]',
    projects: 'id, userId, name, status, sortOrder, createdAt',
    categories: 'id, userId, name, sortOrder, createdAt',
    recurrences: 'id, userId, enabled, frequency, startDate',
    taskHistories: 'id, taskId, userId, action, createdAt',
    settings: 'id, userId',
  })

  // v2 schema: add occurrenceDate index for recurrence deduplication
  db.version(2).stores({
    tasks: 'id, userId, status, priority, scheduledDate, dueDate, projectId, categoryId, source, parentId, recurrenceId, occurrenceDate, sortOrder, createdAt, updatedAt, completedAt, archivedAt',
    workLogs: 'id, userId, title, projectId, categoryId, detailType, createdAt, updatedAt',
    workLogTasks: 'id, workLogId, taskId, [workLogId+taskId]',
    projects: 'id, userId, name, status, sortOrder, createdAt',
    categories: 'id, userId, name, sortOrder, createdAt',
    recurrences: 'id, userId, enabled, frequency, startDate',
    taskHistories: 'id, taskId, userId, action, createdAt',
    settings: 'id, userId',
  })

  // v3 schema: add remindAt index for reminder polling
  db.version(3).stores({
    tasks: 'id, userId, status, priority, scheduledDate, dueDate, projectId, categoryId, source, parentId, recurrenceId, occurrenceDate, remindAt, sortOrder, createdAt, updatedAt, completedAt, archivedAt',
    workLogs: 'id, userId, title, projectId, categoryId, detailType, createdAt, updatedAt',
    workLogTasks: 'id, workLogId, taskId, [workLogId+taskId]',
    projects: 'id, userId, name, status, sortOrder, createdAt',
    categories: 'id, userId, name, sortOrder, createdAt',
    recurrences: 'id, userId, enabled, frequency, startDate',
    taskHistories: 'id, taskId, userId, action, createdAt',
    settings: 'id, userId',
  })

  // v4 schema: add notes table for quick notes / ideas
  db.version(4).stores({
    tasks: 'id, userId, status, priority, scheduledDate, dueDate, projectId, categoryId, source, parentId, recurrenceId, occurrenceDate, remindAt, sortOrder, createdAt, updatedAt, completedAt, archivedAt',
    workLogs: 'id, userId, title, projectId, categoryId, detailType, createdAt, updatedAt',
    workLogTasks: 'id, workLogId, taskId, [workLogId+taskId]',
    notes: 'id, userId, projectId, categoryId, createdAt, updatedAt',
    projects: 'id, userId, name, status, sortOrder, createdAt',
    categories: 'id, userId, name, sortOrder, createdAt',
    recurrences: 'id, userId, enabled, frequency, startDate',
    taskHistories: 'id, taskId, userId, action, createdAt',
    settings: 'id, userId',
  })

  // v5: 下线「临时收件箱」。
  // inbox 曾经是一个独立状态 + 独立工作台区块，移除后这些任务会从所有视图消失，
  // 因此把 status=inbox 迁成 todo（无计划日期 → 落到「长期重要事项」），
  // source=inbox 迁成 note（随记转入），并清理用户设置里残留的 urgent_temp 区块。
  db.version(5)
    .stores({
      tasks: 'id, userId, status, priority, scheduledDate, dueDate, projectId, categoryId, source, parentId, recurrenceId, occurrenceDate, remindAt, sortOrder, createdAt, updatedAt, completedAt, archivedAt',
      workLogs: 'id, userId, title, projectId, categoryId, detailType, createdAt, updatedAt',
      workLogTasks: 'id, workLogId, taskId, [workLogId+taskId]',
      notes: 'id, userId, projectId, categoryId, createdAt, updatedAt',
      projects: 'id, userId, name, status, sortOrder, createdAt',
      categories: 'id, userId, name, sortOrder, createdAt',
      recurrences: 'id, userId, enabled, frequency, startDate',
      taskHistories: 'id, taskId, userId, action, createdAt',
      settings: 'id, userId',
    })
    .upgrade((tx) => {
      return tx
        .table('tasks')
        .toCollection()
        .modify((task: Record<string, unknown>) => {
          if (task.status === 'inbox') task.status = 'todo'
          if (task.source === 'inbox') task.source = 'note'
        })
        .then(() =>
          tx
            .table('settings')
            .toCollection()
            .modify((s: Record<string, unknown>) => {
              const blocks = s.dashboardBlocks
              if (!Array.isArray(blocks)) return
              s.dashboardBlocks = blocks
                .filter((b: { type?: string }) => b?.type !== 'urgent_temp')
                .map((b: Record<string, unknown>, i: number) => ({ ...b, order: i }))
            }),
        )
    })

  dbInstance = db
  return db
}

/** 关闭数据库连接 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

/** 删除整个数据库 */
export async function deleteDB(): Promise<void> {
  closeDB()
  await Dexie.delete(DB_NAME)
}
