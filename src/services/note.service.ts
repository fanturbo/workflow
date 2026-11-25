/**
 * 随记服务
 * 随记用于记录一句话、想法，独立于工作日志，不计入工作统计
 */

import { getRepositories } from '@/db/repositories'
import { CURRENT_USER_ID } from '@/db/database'
import type { Note } from '@/types'
import { TaskService } from './task.service'

export class NoteService {
  /** 创建随记 */
  async createNote(input: {
    content: string
    projectId?: string | null
    categoryId?: string | null
  }): Promise<Note> {
    return getRepositories().notes.create({
      userId: CURRENT_USER_ID,
      content: input.content,
      projectId: input.projectId ?? null,
      categoryId: input.categoryId ?? null,
      convertedTaskId: null,
      convertedWorkLogId: null,
    })
  }

  /** 更新随记 */
  async updateNote(id: string, patch: Partial<Note>): Promise<Note> {
    const { id: _id, userId: _userId, createdAt: _createdAt, ...rest } = patch
    return getRepositories().notes.update(id, rest)
  }

  /** 删除随记 */
  async deleteNote(id: string): Promise<void> {
    await getRepositories().notes.delete(id)
  }

  /** 获取所有随记 */
  async getAllNotes(): Promise<Note[]> {
    return getRepositories().notes.getAll()
  }

  /** 按日期获取随记 */
  async getByDate(date: string): Promise<Note[]> {
    return getRepositories().notes.getByDate(date)
  }

  /** 按日期范围获取随记 */
  async getByDateRange(start: string, end: string): Promise<Note[]> {
    return getRepositories().notes.getByDateRange(start, end)
  }

  /** 搜索随记 */
  async search(keyword: string): Promise<Note[]> {
    return getRepositories().notes.search(keyword)
  }

  /** 转为待办任务（无计划日期，落到「长期重要事项」），并标记随记已转换 */
  async convertToTask(id: string): Promise<{ note: Note; taskId: string }> {
    const repos = getRepositories()
    const note = await repos.notes.getById(id)
    if (!note) throw new Error('随记不存在')
    if (note.convertedTaskId) throw new Error('该随记已转为任务')

    const firstLine = note.content.split('\n').map((line) => line.trim()).find(Boolean) ?? note.content
    const task = await new TaskService().createTask({
      title: firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine,
      description: note.content,
      status: 'todo',
      source: 'note',
      projectId: note.projectId,
      categoryId: note.categoryId,
    })

    const updated = await repos.notes.update(id, { convertedTaskId: task.id })
    return { note: updated, taskId: task.id }
  }

  /** 标记随记已补全为工作记录 */
  async markConvertedWorkLog(id: string, workLogId: string): Promise<Note> {
    return getRepositories().notes.update(id, { convertedWorkLogId: workLogId })
  }
}
