/**
 * 仓储容器 - 依赖注入入口
 * 组件和服务通过此模块获取仓储实例
 * 后续替换为 API 时，只需修改此文件
 */

import { TaskRepository } from './task.repository'
import { WorkLogRepository } from './worklog.repository'
import { WorkLogTaskRepository } from './worklog-task.repository'
import { NoteRepository } from './note.repository'
import { ProjectRepository } from './project.repository'
import { CategoryRepository } from './category.repository'
import { RecurrenceRepository } from './recurrence.repository'
import { TaskHistoryRepository } from './task-history.repository'
import { SettingsRepository } from './settings.repository'

import type {
  ITaskRepository,
  IWorkLogRepository,
  IWorkLogTaskRepository,
  INoteRepository,
  IProjectRepository,
  ICategoryRepository,
  IRecurrenceRepository,
  ITaskHistoryRepository,
  ISettingsRepository,
} from './interfaces'

export interface RepositoryContainer {
  tasks: ITaskRepository
  workLogs: IWorkLogRepository
  workLogTasks: IWorkLogTaskRepository
  notes: INoteRepository
  projects: IProjectRepository
  categories: ICategoryRepository
  recurrences: IRecurrenceRepository
  taskHistories: ITaskHistoryRepository
  settings: ISettingsRepository
}

let container: RepositoryContainer | null = null

export function getRepositories(): RepositoryContainer {
  if (container) return container

  container = {
    tasks: new TaskRepository(),
    workLogs: new WorkLogRepository(),
    workLogTasks: new WorkLogTaskRepository(),
    notes: new NoteRepository(),
    projects: new ProjectRepository(),
    categories: new CategoryRepository(),
    recurrences: new RecurrenceRepository(),
    taskHistories: new TaskHistoryRepository(),
    settings: new SettingsRepository(),
  }

  return container
}

export { type RepositoryContainer as Repositories }

export {
  TaskRepository,
  WorkLogRepository,
  WorkLogTaskRepository,
  NoteRepository,
  ProjectRepository,
  CategoryRepository,
  RecurrenceRepository,
  TaskHistoryRepository,
  SettingsRepository,
}
