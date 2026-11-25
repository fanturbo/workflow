/**
 * 数据访问层接口
 * 定义统一的数据访问契约，后续可替换为 API 实现
 */

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
  TaskFilter,
  PageParams,
  PageResult,
} from '@/types'

/** 基础仓储接口 */
export interface IBaseRepository<T extends { id: string }> {
  getById(id: string): Promise<T | null>
  getAll(): Promise<T[]>
  create(entity: Partial<T>): Promise<T>
  update(id: string, patch: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
  bulkCreate(entities: T[]): Promise<void>
  bulkUpdate(ids: string[], patch: Partial<T>): Promise<void>
  clear(): Promise<void>
}

/** 任务仓储接口 */
export interface ITaskRepository extends IBaseRepository<Task> {
  getByStatus(status: Task['status']): Promise<Task[]>
  getByScheduledDate(date: string): Promise<Task[]>
  getByDateRange(start: string, end: string): Promise<Task[]>
  getByProject(projectId: string): Promise<Task[]>
  getByCategory(categoryId: string): Promise<Task[]>
  getByRecurrence(recurrenceId: string): Promise<Task[]>
  filter(filter: TaskFilter): Promise<Task[]>
  paginate(filter: TaskFilter, params: PageParams): Promise<PageResult<Task>>
  countByStatus(status: Task['status']): Promise<number>
  getByMaxSortOrder(): Promise<number>
  getMustFinishToday(): Promise<Task[]>
  getThisWeek(): Promise<Task[]>
  getLongTerm(): Promise<Task[]>
  getDailyRoutine(): Promise<Task[]>
  getTodayOverdue(): Promise<Task[]>
  getTodayCompleted(): Promise<Task[]>
}

/** 工作日志仓储接口 */
export interface IWorkLogRepository extends IBaseRepository<WorkLog> {
  getByProject(projectId: string): Promise<WorkLog[]>
  getByDateRange(start: string, end: string): Promise<WorkLog[]>
  getByDate(date: string): Promise<WorkLog[]>
  search(keyword: string): Promise<WorkLog[]>
}

/** 工作日志-任务关联仓储接口 */
export interface IWorkLogTaskRepository extends IBaseRepository<WorkLogTask> {
  getByWorkLog(workLogId: string): Promise<WorkLogTask[]>
  getByTask(taskId: string): Promise<WorkLogTask[]>
  link(workLogId: string, taskId: string): Promise<void>
  unlink(workLogId: string, taskId: string): Promise<void>
  unlinkByWorkLog(workLogId: string): Promise<void>
  unlinkByTask(taskId: string): Promise<void>
  getTaskIdsByWorkLog(workLogId: string): Promise<string[]>
  getWorkLogIdsByTask(taskId: string): Promise<string[]>
}

/** 随记仓储接口 */
export interface INoteRepository extends IBaseRepository<Note> {
  getByDate(date: string): Promise<Note[]>
  getByDateRange(start: string, end: string): Promise<Note[]>
  search(keyword: string): Promise<Note[]>
}

/** 项目仓储接口 */
export interface IProjectRepository extends IBaseRepository<Project> {
  getByStatus(status: Project['status']): Promise<Project[]>
}

/** 分类仓储接口 */
export interface ICategoryRepository extends IBaseRepository<Category> {
  getByName(name: string): Promise<Category | null>
}

/** 周期规则仓储接口 */
export interface IRecurrenceRepository extends IBaseRepository<Recurrence> {
  getEnabled(): Promise<Recurrence[]>
}

/** 任务历史仓储接口 */
export interface ITaskHistoryRepository extends IBaseRepository<TaskHistory> {
  getByTask(taskId: string): Promise<TaskHistory[]>
}

/** 用户设置仓储接口 */
export interface ISettingsRepository {
  getByUserId(userId: string): Promise<UserSettings | null>
  save(settings: UserSettings): Promise<UserSettings>
  getDefault(): Promise<UserSettings>
}
