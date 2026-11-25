/**
 * 数据备份与恢复服务
 */

import { getDB, CURRENT_USER_ID } from '@/db/database'
import { getRepositories } from '@/db/repositories'
import { DEFAULT_DASHBOARD_BLOCKS } from '@/constants/task'
import type { BackupData, TaskPriority, TaskStatus } from '@/types'
import { StatisticsService } from './statistics.service'
import { dayjs, nowUtc, toUtc } from '@/utils/date'

/** CSV 导入的列 */
type TaskCsvColumn =
  | 'title'
  | 'description'
  | 'priority'
  | 'status'
  | 'scheduledDate'
  | 'dueDate'
  | 'remindAt'
  | 'project'
  | 'category'

const TASK_CSV_HEADERS: Record<string, TaskCsvColumn> = {
  '标题': 'title',
  'title': 'title',
  '任务': 'title',
  '任务标题': 'title',
  '描述': 'description',
  'description': 'description',
  '内容': 'description',
  '备注': 'description',
  '优先级': 'priority',
  'priority': 'priority',
  '状态': 'status',
  'status': 'status',
  '计划日期': 'scheduledDate',
  'scheduleddate': 'scheduledDate',
  '开始日期': 'scheduledDate',
  '截止日期': 'dueDate',
  'duedate': 'dueDate',
  '提醒时间': 'remindAt',
  'remindat': 'remindAt',
  '项目': 'project',
  'project': 'project',
  '分类': 'category',
  'category': 'category',
}

const TASK_CSV_PRIORITY: Record<string, TaskPriority> = {
  p0: 'P0',
  '0': 'P0',
  '紧急': 'P0',
  p1: 'P1',
  '1': 'P1',
  '重要': 'P1',
  p2: 'P2',
  '2': 'P2',
  '普通': 'P2',
  p3: 'P3',
  '3': 'P3',
  '低优': 'P3',
}

const TASK_CSV_STATUS: Record<string, TaskStatus> = {
  // 兼容旧 CSV：收件箱下线后，原有 inbox / 收件箱 / 待整理 状态归一为 todo
  inbox: 'todo',
  '收件箱': 'todo',
  '待整理': 'todo',
  todo: 'todo',
  '待处理': 'todo',
  '待办': 'todo',
  in_progress: 'in_progress',
  '进行中': 'in_progress',
  completed: 'completed',
  '已完成': 'completed',
  '完成': 'completed',
  on_hold: 'on_hold',
  '已搁置': 'on_hold',
  '搁置': 'on_hold',
  cancelled: 'cancelled',
  '已取消': 'cancelled',
  '取消': 'cancelled',
}

/** 解析后的 CSV 任务行 */
export interface ParsedTaskCsvRow {
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  scheduledDate: string | null
  dueDate: string | null
  remindAt: string | null
  projectName: string
  categoryName: string
}

/** CSV 行错误 */
export interface TaskCsvError {
  /** 数据行序号，从 1 开始（不含表头） */
  line: number
  message: string
}

/** CSV 解析结果 */
export interface TaskCsvParseResult {
  rows: ParsedTaskCsvRow[]
  errors: TaskCsvError[]
}

/** CSV 导入结果 */
export interface TaskCsvImportResult {
  imported: number
  createdProjects: string[]
  createdCategories: string[]
}

export class BackupService {
  /** 导出全量数据为 JSON */
  async exportAll(): Promise<BackupData> {
    const db = getDB()
    return db.transaction('r', db.tables, async () => await this.readSnapshot())
  }

  private async readSnapshot(): Promise<BackupData> {
    const repos = getRepositories()
    const [tasks, workLogs, workLogTasks, notes, projects, categories, recurrences, taskHistories] =
      await Promise.all([
        repos.tasks.getAll(),
        repos.workLogs.getAll(),
        repos.workLogTasks.getAll(),
        repos.notes.getAll(),
        repos.projects.getAll(),
        repos.categories.getAll(),
        repos.recurrences.getAll(),
        repos.taskHistories.getAll(),
      ])

    const settings = await repos.settings.getByUserId('default-user')

    return {
      version: '1.0.0',
      exportedAt: nowUtc(),
      tasks,
      workLogs,
      workLogTasks,
      notes,
      projects,
      categories,
      recurrences,
      taskHistories,
      settings,
    }
  }

  /** 导出为 JSON 字符串 */
  async exportJson(): Promise<string> {
    const data = await this.exportAll()
    return JSON.stringify(data, null, 2)
  }

  /** 导出为 CSV（任务列表） */
  async exportTasksCsv(): Promise<string> {
    const repos = getRepositories()
    const tasks = await repos.tasks.getAll()
    const projects = await repos.projects.getAll()
    const categories = await repos.categories.getAll()

    const headers = ['ID', '标题', '描述', '优先级', '状态', '计划日期', '截止日期', '项目', '分类', '创建时间', '完成时间']
    const rows = tasks.filter((t) => !t.archivedAt).map((t) => {
      const project = projects.find((p) => p.id === t.projectId)
      const category = categories.find((c) => c.id === t.categoryId)
      return [
        t.id,
        this.escapeCsv(t.title),
        this.escapeCsv(t.description ?? ''),
        t.priority,
        t.status,
        t.scheduledDate ?? '',
        t.dueDate ?? '',
        project?.name ?? '',
        category?.name ?? '',
        t.createdAt,
        t.completedAt ?? '',
      ]
    })

    return [headers, ...rows].map((r) => r.join(',')).join('\n')
  }

  /** 生成任务 CSV 导入模板（仅表头） */
  generateTaskCsvTemplate(): string {
    const headers = ['标题', '描述', '优先级', '状态', '计划日期', '截止日期', '提醒时间', '项目', '分类']
    return `\uFEFF${headers.join(',')}\n`
  }

  /** 解析任务 CSV（不写库） */
  parseTasksCsv(csv: string): TaskCsvParseResult {
    const table = this.parseCsvTable(csv)
    if (table.length === 0) {
      return { rows: [], errors: [{ line: 1, message: '文件为空' }] }
    }

    const indexes: Partial<Record<TaskCsvColumn, number>> = {}
    table[0].forEach((header, index) => {
      const key = TASK_CSV_HEADERS[this.normalizeCsvHeader(header)]
      if (key && indexes[key] === undefined) indexes[key] = index
    })

    if (indexes.title === undefined) {
      return { rows: [], errors: [{ line: 1, message: '缺少必填列「标题」' }] }
    }

    const rows: ParsedTaskCsvRow[] = []
    const errors: TaskCsvError[] = []

    for (let i = 1; i < table.length; i++) {
      const cells = table[i]
      const get = (column: TaskCsvColumn): string => {
        const index = indexes[column]
        return index === undefined ? '' : (cells[index] ?? '').trim()
      }

      const title = get('title')
      const problems: string[] = []
      if (!title) problems.push('标题不能为空')

      const priorityRaw = get('priority')
      const priorityKey = priorityRaw.replace(/\s+/g, '').toLowerCase()
      const priority = priorityRaw ? TASK_CSV_PRIORITY[priorityKey] : 'P2'
      if (!priority) problems.push(`优先级「${priorityRaw}」无效，可选 P0-P3`)

      const statusRaw = get('status')
      const statusKey = statusRaw.replace(/\s+/g, '').toLowerCase()
      const status = statusRaw ? TASK_CSV_STATUS[statusKey] : 'todo'
      if (!status) problems.push(`状态「${statusRaw}」无效`)

      const scheduledRaw = get('scheduledDate')
      const scheduledDate = this.normalizeCsvDate(scheduledRaw)
      if (scheduledDate === undefined) problems.push(`计划日期「${scheduledRaw}」无效，应为 YYYY-MM-DD`)

      const dueRaw = get('dueDate')
      const dueDate = this.normalizeCsvDate(dueRaw)
      if (dueDate === undefined) problems.push(`截止日期「${dueRaw}」无效，应为 YYYY-MM-DD`)

      const remindRaw = get('remindAt')
      const remindAt = this.normalizeCsvDateTime(remindRaw)
      if (remindAt === undefined) problems.push(`提醒时间「${remindRaw}」无效，应为 YYYY-MM-DD HH:mm`)

      if (problems.length > 0) {
        errors.push({ line: i, message: problems.join('；') })
        continue
      }

      rows.push({
        title,
        description: get('description'),
        priority: priority as TaskPriority,
        status: status as TaskStatus,
        scheduledDate: scheduledDate ?? null,
        dueDate: dueDate ?? null,
        remindAt: remindAt ?? null,
        projectName: get('project'),
        categoryName: get('category'),
      })
    }

    return { rows, errors }
  }

  /** 追加导入任务 CSV，项目/分类不存在时自动创建 */
  async importTasksCsv(csv: string): Promise<TaskCsvImportResult> {
    const parsed = this.parseTasksCsv(csv)
    if (parsed.errors.length > 0) {
      const first = parsed.errors[0]
      throw new Error(`第 ${first.line} 条数据：${first.message}`)
    }
    if (parsed.rows.length === 0) throw new Error('CSV 中没有可导入的任务')

    const db = getDB()
    const repos = getRepositories()
    const createdProjects: string[] = []
    const createdCategories: string[] = []

    await db.transaction('rw', [db.tasks, db.projects, db.categories], async () => {
      const projects = await repos.projects.getAll()
      const categories = await repos.categories.getAll()
      const projectMap = new Map(projects.map((p) => [p.name.trim().toLowerCase(), p.id]))
      const categoryMap = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]))
      let projectSort = projects.length
      let categorySort = categories.length
      let sort = await repos.tasks.getByMaxSortOrder()

      for (const row of parsed.rows) {
        let projectId: string | null = null
        const projectName = row.projectName.trim()
        if (projectName) {
          const key = projectName.toLowerCase()
          projectId = projectMap.get(key) ?? null
          if (!projectId) {
            const project = await repos.projects.create({
              userId: CURRENT_USER_ID,
              name: projectName,
              description: '',
              status: 'active',
              startDate: null,
              endDate: null,
              color: '#4F6EF7',
              sortOrder: projectSort++,
            })
            projectId = project.id
            projectMap.set(key, project.id)
            createdProjects.push(project.name)
          }
        }

        let categoryId: string | null = null
        const categoryName = row.categoryName.trim()
        if (categoryName) {
          const key = categoryName.toLowerCase()
          categoryId = categoryMap.get(key) ?? null
          if (!categoryId) {
            const category = await repos.categories.create({
              userId: CURRENT_USER_ID,
              name: categoryName,
              color: '#64748B',
              icon: 'dots',
              sortOrder: categorySort++,
            })
            categoryId = category.id
            categoryMap.set(key, category.id)
            createdCategories.push(category.name)
          }
        }

        sort += 1
        await repos.tasks.create({
          userId: CURRENT_USER_ID,
          title: row.title,
          description: row.description,
          priority: row.priority,
          status: row.status,
          scheduledDate: row.scheduledDate ? toUtc(row.scheduledDate) : null,
          dueDate: row.dueDate ? toUtc(row.dueDate) : null,
          projectId,
          categoryId,
          source: 'import',
          parentId: null,
          recurrenceId: null,
          remindAt: row.remindAt ? toUtc(row.remindAt) : null,
          remindedAt: null,
          reminderAckedAt: null,
          reminderSnoozeUntil: null,
          lastRemindedAt: null,
          sortOrder: sort,
          completedAt: row.status === 'completed' ? nowUtc() : null,
          archivedAt: null,
        })
      }
    })

    return {
      imported: parsed.rows.length,
      createdProjects,
      createdCategories,
    }
  }

  /** 解析 CSV 为二维数组，支持引号包裹、逗号与换行 */
  private parseCsvTable(text: string): string[][] {
    const source = text.replace(/^\uFEFF/, '')
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let inQuotes = false

    for (let i = 0; i < source.length; i++) {
      const char = source[i]
      if (inQuotes) {
        if (char === '"') {
          if (source[i + 1] === '"') {
            cell += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          cell += char
        }
        continue
      }

      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        row.push(cell)
        cell = ''
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && source[i + 1] === '\n') i++
        row.push(cell)
        rows.push(row)
        row = []
        cell = ''
      } else {
        cell += char
      }
    }

    if (cell !== '' || row.length > 0) {
      row.push(cell)
      rows.push(row)
    }

    return rows.filter((r) => r.some((value) => value.trim() !== ''))
  }

  private normalizeCsvHeader(header: string): string {
    return header.replace(/^\uFEFF/, '').replace(/\s+/g, '').toLowerCase()
  }

  /** 返回 null 表示空值，undefined 表示格式无效 */
  private normalizeCsvDate(value: string): string | null | undefined {
    const raw = value.trim()
    if (!raw) return null
    const datePart = raw.split(/[ T]/)[0]
    const match = datePart.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
    if (!match) return undefined
    const normalized = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    const date = dayjs(normalized)
    if (!date.isValid() || date.format('YYYY-MM-DD') !== normalized) return undefined
    return normalized
  }

  /** 返回 null 表示空值，undefined 表示格式无效 */
  private normalizeCsvDateTime(value: string): string | null | undefined {
    const raw = value.trim()
    if (!raw) return null
    const match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[ T](\d{1,2}):(\d{2})$/)
    if (!match) return undefined
    const normalized = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')} ${match[4].padStart(2, '0')}:${match[5]}`
    const date = dayjs(normalized)
    if (!date.isValid() || date.format('YYYY-MM-DD HH:mm') !== normalized) return undefined
    return normalized
  }

  /** 导出 Markdown 工作总结 */
  async exportMarkdownSummary(startDate: string, endDate: string): Promise<string> {
    const repos = getRepositories()
    const { completedTasks } = await new StatisticsService().getReviewStatistics(startDate, endDate)
    const logs = await repos.workLogs.getByDateRange(startDate, endDate)
    const projects = await repos.projects.getAll()
    const categories = await repos.categories.getAll()

    let md = `# 工作总结\n\n`
    md += `**时间范围：** ${startDate} ~ ${endDate}\n\n`
    md += `**生成时间：** ${nowUtc()}\n\n`
    md += `---\n\n`

    md += `## 完成任务 (${completedTasks.length})\n\n`
    for (const t of completedTasks) {
      const project = projects.find((p) => p.id === t.projectId)
      md += `- [${t.priority}] ${t.title}`
      if (project) md += ` (${project.name})`
      md += '\n'
    }

    md += `\n## 工作日志 (${logs.length})\n\n`
    for (const log of logs) {
      const category = categories.find((c) => c.id === log.categoryId)
      md += `### ${log.title}\n\n`
      if (category) md += `分类：${category.name}\n\n`
      if (log.content) md += `**内容：** ${log.content}\n\n`
      if (log.result) md += `**成果：** ${log.result}\n\n`
      md += `---\n\n`
    }

    return md
  }

  /** 导入备份 */
  async importBackup(data: BackupData): Promise<{ imported: number; skipped: number }> {
    const check = this.validateBackup(data)
    if (!check.valid) throw new Error(check.errors.join('，'))
    const db = getDB()
    let imported = 0
    let skipped = 0

    await db.transaction(
      'rw',
      [db.tasks, db.workLogs, db.workLogTasks, db.notes, db.projects, db.categories, db.recurrences, db.taskHistories, db.settings],
      async () => {
        // 清空现有数据
        await db.tasks.clear()
        await db.workLogs.clear()
        await db.workLogTasks.clear()
        await db.notes.clear()
        await db.projects.clear()
        await db.categories.clear()
        await db.recurrences.clear()
        await db.taskHistories.clear()
        await db.settings.clear()

        // 导入数据
        if (data.categories?.length) {
          await db.categories.bulkPut(data.categories)
          imported += data.categories.length
        }
        if (data.projects?.length) {
          await db.projects.bulkPut(data.projects)
          imported += data.projects.length
        }
        if (data.tasks?.length) {
          // 兼容旧备份：收件箱下线后把 status=inbox 归一为 todo，source=inbox 归一为 note
          const normalized = data.tasks.map((t) => ({
            ...t,
            status: (t.status as string) === 'inbox' ? ('todo' as const) : t.status,
            source: (t.source as string) === 'inbox' ? ('note' as const) : t.source,
          }))
          await db.tasks.bulkPut(normalized)
          imported += data.tasks.length
        }
        if (data.workLogs?.length) {
          await db.workLogs.bulkPut(data.workLogs)
          imported += data.workLogs.length
        }
        if (data.workLogTasks?.length) {
          await db.workLogTasks.bulkPut(data.workLogTasks)
          imported += data.workLogTasks.length
        }
        if (data.notes?.length) {
          await db.notes.bulkPut(data.notes)
          imported += data.notes.length
        }
        if (data.recurrences?.length) {
          await db.recurrences.bulkPut(data.recurrences)
          imported += data.recurrences.length
        }
        if (data.taskHistories?.length) {
          await db.taskHistories.bulkPut(data.taskHistories)
          imported += data.taskHistories.length
        }
        if (data.settings) {
          // 兼容旧备份：清理已下线的「临时收件箱」区块并重排 order。
          // 否则 DashboardView 里 DASHBOARD_BLOCK_CONFIGS['urgent_temp'].label 会抛错导致白屏。
          const blocks = Array.isArray(data.settings.dashboardBlocks)
            ? data.settings.dashboardBlocks
            : []
          const cleaned = blocks
            .filter((b) => b && DEFAULT_DASHBOARD_BLOCKS.includes(b.type))
            .map((b, index) => ({ ...b, order: index }))
          const dashboardBlocks = cleaned.length > 0
            ? cleaned
            : DEFAULT_DASHBOARD_BLOCKS.map((type, index) => ({ type, visible: true, order: index }))
          await db.settings.put({ ...data.settings, dashboardBlocks })
          imported += 1
        }
      },
    )

    return { imported, skipped }
  }

  /** 验证备份数据格式 */
  validateBackup(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['数据格式无效'] }
    }
    const d = data as Record<string, unknown>
    if (d.version !== '1.0.0') errors.push('备份版本不支持')
    const tables = ['tasks', 'workLogs', 'projects', 'categories', 'recurrences', 'taskHistories', 'workLogTasks']
    const ids = new Map<string, Set<string>>()
    for (const table of tables) {
      const rows = d[table]
      const keys = new Set<string>()
      ids.set(table, keys)
      if (!Array.isArray(rows)) {
        errors.push(table + ' 数据表缺失')
        continue
      }
      for (const row of rows) {
        if (!row || typeof row.id !== 'string' || !row.id || keys.has(row.id)) {
          errors.push(table + ' 存在无效或重复 ID')
          break
        }
        keys.add(row.id)
        if (table !== 'workLogTasks' && (row.userId !== 'default-user' || !Number.isFinite(Date.parse(row.createdAt)))) {
          errors.push(table + ' 用户或创建日期无效')
          break
        }
        if (['tasks', 'workLogs', 'recurrences'].includes(table) && (typeof row.title !== 'string' || !row.title.trim())) {
          errors.push(table + ' 标题无效')
          break
        }
        // 兼容旧备份：inbox 状态允许通过校验，导入时统一归一为 todo
        if (table === 'tasks' && (!['todo','inbox','completed','in_progress','on_hold','cancelled'].includes(row.status) || !['P0','P1','P2','P3'].includes(row.priority))) {
          errors.push('任务状态或优先级无效')
          break
        }
      }
    }
    // 随记表为 v1.1 新增，旧备份可以没有
    if (d.notes !== undefined) {
      if (!Array.isArray(d.notes)) {
        errors.push('notes 数据表无效')
      } else {
        const noteIds = new Set<string>()
        for (const row of d.notes as Array<Record<string, unknown>>) {
          if (!row || typeof row.id !== 'string' || !row.id || noteIds.has(row.id)) {
            errors.push('notes 存在无效或重复 ID')
            break
          }
          noteIds.add(row.id)
          if (row.userId !== 'default-user' || !Number.isFinite(Date.parse(String(row.createdAt))) ||
              typeof row.content !== 'string' || !row.content.trim()) {
            errors.push('notes 内容或日期无效')
            break
          }
        }
      }
    }

    if (!errors.length) {
      const backup = data as BackupData
      const pairs = new Set<string>()
      for (const link of backup.workLogTasks) {
        const pair = JSON.stringify([link.workLogId, link.taskId])
        if (pairs.has(pair) || !ids.get('tasks')?.has(link.taskId) || !ids.get('workLogs')?.has(link.workLogId)) {
          errors.push('日志与任务的关联重复或无效')
          break
        }
        pairs.add(pair)
      }
      for (const row of [...backup.tasks, ...backup.workLogs, ...backup.recurrences, ...(backup.notes ?? [])]) {
        if ((row.projectId && !ids.get('projects')?.has(row.projectId)) ||
            (row.categoryId && !ids.get('categories')?.has(row.categoryId))) {
          errors.push('项目或分类引用无效')
          break
        }
      }
      if ((backup.notes ?? []).some(note =>
        (note.convertedTaskId && !ids.get('tasks')?.has(note.convertedTaskId)) ||
        (note.convertedWorkLogId && !ids.get('workLogs')?.has(note.convertedWorkLogId)))) {
        errors.push('随记转换引用无效')
      }
      if (backup.tasks.some(task => (task.parentId && !ids.get('tasks')?.has(task.parentId)) ||
          (task.recurrenceId && !ids.get('recurrences')?.has(task.recurrenceId)))) errors.push('父任务或周期规则引用无效')
      if (backup.recurrences.some(rule => !Number.isInteger(rule.interval) || rule.interval < 1 ||
          !Array.isArray(rule.weekdays) || !rule.weekdays.every(d => Number.isInteger(d) && d >= 0 && d <= 6) ||
          typeof rule.enabled !== 'boolean' || !Number.isFinite(Date.parse(rule.startDate)) ||
          !['daily','weekly','monthly','workday','custom'].includes(rule.frequency))) errors.push('周期规则无效')
      if (backup.workLogs.some(log => !['quick','standard','detailed'].includes(log.detailType))) errors.push('日志类型无效')
      if (backup.tasks.some(task => [task.scheduledDate, task.dueDate, task.completedAt, task.archivedAt]
          .some(date => date != null && !Number.isFinite(Date.parse(date))))) errors.push('任务日期无效')
      if (backup.taskHistories.some(row => !ids.get('tasks')?.has(row.taskId))) errors.push('历史记录引用无效')
      // 兼容旧备份：urgent_temp 区块允许通过校验，导入时清理
      if (backup.settings !== null && (!backup.settings?.id || backup.settings.userId !== 'default-user' || !Array.isArray(backup.settings.dashboardBlocks) || backup.settings.dashboardBlocks.some(block => !block || !['must_finish_today','urgent_temp','this_week','long_term','daily_routine'].includes(block.type)))) errors.push('设置数据无效')
    }
    return { valid: errors.length === 0, errors }
  }

  /** CSV 转义 */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}
