/**
 * 服务容器 - 统一入口
 */

import { TaskService } from './task.service'
import { WorkLogService } from './worklog.service'
import { NoteService } from './note.service'
import { ProjectService } from './project.service'
import { CategoryService } from './category.service'
import { RecurrenceService } from './recurrence.service'
import { ReminderService } from './reminder.service'
import { StatisticsService } from './statistics.service'
import { BackupService } from './backup.service'
import { SettingsService } from './settings.service'

export {
  TaskService,
  WorkLogService,
  NoteService,
  ProjectService,
  CategoryService,
  RecurrenceService,
  ReminderService,
  StatisticsService,
  BackupService,
  SettingsService,
}

/** 获取服务实例 */
export function getServices() {
  return {
    task: new TaskService(),
    workLog: new WorkLogService(),
    note: new NoteService(),
    project: new ProjectService(),
    category: new CategoryService(),
    recurrence: new RecurrenceService(),
    reminder: new ReminderService(),
    statistics: new StatisticsService(),
    backup: new BackupService(),
    settings: new SettingsService(),
  }
}

/** 单例服务实例 */
let services: ReturnType<typeof getServices> | null = null

export function useServices() {
  if (!services) {
    services = getServices()
  }
  return services
}
