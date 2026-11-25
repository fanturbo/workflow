import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
after(() => server.close())
const { useServices } = await server.ssrLoadModule('/src/services/index.ts')
const { getDB } = await server.ssrLoadModule('/src/db/database.ts')
const { todayLocal, addDays, toUtc, nowUtc } = await server.ssrLoadModule('/src/utils/date.ts')
const services = useServices()
const today = todayLocal()

test('周期实例在并发刷新、延期和归档后保持唯一', async () => {
  const rule = await services.recurrence.createRecurrence({ title: '周报', frequency: 'daily', startDate: today })
  await Promise.all([services.recurrence.generateTodayTasks(), services.recurrence.generateTodayTasks()])
  const instances = await services.recurrence.getInstances(rule.id)
  assert.equal(instances.length, 1)
  await services.task.rescheduleTask(instances[0].id, addDays(today, 1))
  await services.task.archiveTask(instances[0].id)
  assert.equal((await services.recurrence.generateTodayTasks()).length, 0)
})

test('完成后重新打开、归档，复盘与导出仍保留成果', async () => {
  const task = await services.task.quickCreate('交付报告')
  await services.task.completeTask(task.id)
  await services.task.completeTask(task.id)
  await services.task.reopenTask(task.id)
  await services.task.archiveTask(task.id)
  const stats = await services.statistics.getReviewStatistics(today, today)
  assert.equal(stats.completedTaskCount, 1)
  assert.equal(stats.trend[0].completed, 1)
  assert.match(await services.backup.exportMarkdownSummary(today, today), /交付报告/)
})

test('恢复保留多对多关联，无效备份不能覆盖原数据', async () => {
  const tasks = await Promise.all(['验收', '部署'].map(title => services.task.quickCreate(title)))
  const log = await services.workLog.createWorkLog({ title: '联调', taskIds: tasks.map(t => t.id) })
  const backup = await services.backup.exportAll()
  for (const invalid of [
    { ...backup, workLogTasks: undefined },
    { ...backup, tasks: [...backup.tasks, backup.tasks[0]] },
    { ...backup, workLogTasks: [{ id: 'bad', taskId: 'missing', workLogId: log.id }] },
  ]) {
    await assert.rejects(() => services.backup.importBackup(invalid))
    assert.equal(await getDB().tasks.count(), backup.tasks.length)
  }
  await getDB().workLogTasks.clear()
  await services.backup.importBackup(backup)
  assert.equal(await getDB().workLogTasks.where('workLogId').equals(log.id).count(), 2)
})

test('低优先级与遗留事项出现在今天，原计划日期保留', async () => {
  const yesterday = addDays(today, -1)
  const prior = await services.task.createTask({ title: '昨日遗留', priority: 'P3', status: 'todo', scheduledDate: yesterday })
  const current = await services.task.createTask({ title: '普通任务', priority: 'P2', status: 'todo', scheduledDate: today })
  const visible = await services.task.getDashboardBlockTasks('must_finish_today')
  assert.ok(visible.some(task => task.id === current.id))
  assert.equal(visible.find(task => task.id === prior.id).scheduledDate, prior.scheduledDate)
  await services.task.batchUpdateScheduledDate([prior.id], today)
  const changes = await services.task.getTaskHistory(prior.id)
  assert.equal(changes[0].oldValue, prior.scheduledDate)
})

test('周期实例继承提醒时间，修改提醒时间后重置触发标记', async () => {
  const rule = await services.recurrence.createRecurrence({
    title: '晨会提醒', frequency: 'daily', startDate: today, remindTime: '09:30',
  })
  await services.recurrence.generateTodayTasks()
  const instances = await services.recurrence.getInstances(rule.id)
  assert.equal(instances.length, 1)
  const instance = instances[0]
  // 本地 09:30 转 UTC 存储
  assert.equal(instance.remindAt, toUtc(`${today}T09:30`))
  // 当天 09:30 已过时应预设为已提醒（避免立即补弹），未过时为空
  const reminderPassed = new Date(instance.remindAt).getTime() <= Date.now()
  assert.equal(instance.remindedAt === null, !reminderPassed)
  // 模拟已触发，再修改提醒时间应重置 remindedAt
  await services.task.updateTask(instance.id, { remindedAt: nowUtc() })
  assert.ok((await services.task.getTask(instance.id)).remindedAt)
  await services.task.updateTask(instance.id, { remindAt: `${today}T10:00` })
  const updated = await services.task.getTask(instance.id)
  assert.equal(updated.remindedAt, null)
  assert.equal(updated.remindAt, toUtc(`${today}T10:00`))
})

test('每月规则在对应日期生成，31 号规则在非月末不提前生成', async () => {
  const dayOfMonth = new Date().getDate()
  const monthly = await services.recurrence.createRecurrence({
    title: '月报', frequency: 'monthly', startDate: today, monthDay: dayOfMonth,
  })
  const generated = await services.recurrence.generateTodayTasks()
  assert.ok(generated.some(t => t.recurrenceId === monthly.id))
  // 钳位边界：monthDay=31 时，小月只在最后一天生成，月中（今天）不生成
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  if (daysInMonth < 31 && dayOfMonth < daysInMonth) {
    const endOfMonth = await services.recurrence.createRecurrence({
      title: '月末结账', frequency: 'monthly', startDate: today, monthDay: 31,
    })
    const again = await services.recurrence.generateTodayTasks()
    assert.ok(!again.some(t => t.recurrenceId === endOfMonth.id))
  }
})

test('删除随记后不再出现在今日随记与全量列表，且不影响其他随记', async () => {
  const removed = await services.note.createNote({ content: '待删除的随记' })
  const kept = await services.note.createNote({ content: '保留的随记' })
  assert.ok((await services.note.getAllNotes()).some(n => n.id === removed.id))

  await services.note.deleteNote(removed.id)
  const all = await services.note.getAllNotes()
  assert.ok(!all.some(n => n.id === removed.id), '全量列表应已移除')
  assert.ok(all.some(n => n.id === kept.id), '不能误删其他随记')
  assert.ok(!(await services.note.getByDate(today)).some(n => n.id === removed.id), '今日随记应已移除')
})

test('跨区块拖拽落库后：清除计划日期的任务从「今天要做」转入「长期重要事项」', async () => {
  const task = await services.task.createTask({ title: '拖拽归属验证', status: 'todo', scheduledDate: today })
  const has = (list) => list.some(t => t.id === task.id)
  assert.ok(has(await services.task.getDashboardBlockTasks('must_finish_today')), '初始应在今天要做')

  // 与 DashboardView.handleTaskDrop 中 long_term 的 patch 一致
  await services.task.updateTask(task.id, { status: 'todo', scheduledDate: null })
  assert.equal((await services.task.getTask(task.id)).scheduledDate, null, '计划日期应已清空并落库')
  assert.ok(!has(await services.task.getDashboardBlockTasks('must_finish_today')), '刷新后不应回到今天要做')
  assert.ok(has(await services.task.getDashboardBlockTasks('long_term')), '应出现在长期重要事项')
})

test('提醒未确认前常驻且可按间隔重复响铃，刷新后可恢复，手动确认后结束', async () => {
  const at = new Date(Date.now() - 1000).toISOString()
  const task = await services.task.createTask({ title: '持久化提醒验证', status: 'todo', remindAt: at })
  const has = (list) => list.some(t => t.id === task.id)

  const first = await services.reminder.checkDue(30, true)
  assert.ok(has(first.hits), '首次到期应响铃')
  assert.ok(first.firstTime.includes(task.id), '首次到期应发桌面通知')

  // 间隔未到：本次不响，但待确认提醒仍在（浮层不会消失）
  const again = await services.reminder.checkDue(30, true)
  assert.ok(!has(again.hits), '间隔内不重复响铃')
  assert.ok(has(again.active), '未确认前仍常驻')

  // 模拟刷新：直接从 DB 恢复，不依赖内存态
  assert.ok(has(await services.reminder.getActiveAlerts()), '刷新后应恢复浮层')

  // 把上次响铃时间往前拨，验证重复提醒确实会再次响
  await services.task.updateTask(task.id, { lastRemindedAt: new Date(Date.now() - 60_000).toISOString() })
  const repeated = await services.reminder.checkDue(30, true)
  assert.ok(has(repeated.hits), '超过间隔应再次响铃')
  assert.ok(!repeated.firstTime.includes(task.id), '重复响铃不再重复发桌面通知')

  // 稍后提醒：暂时收起，到点前不再展示
  await services.reminder.snooze(task.id, 10)
  assert.ok(!has(await services.reminder.getActiveAlerts()), '稍后提醒期间应收起')

  // 手动确认后彻底结束
  await services.task.updateTask(task.id, { reminderSnoozeUntil: null })
  await services.reminder.ack(task.id)
  assert.ok(!has(await services.reminder.getActiveAlerts()), '确认后不再展示')
  assert.ok(!has((await services.reminder.checkDue(30, true)).active), '确认后不再触发')

  // 改提醒时间应重置整条状态，让新时间重新生效
  await services.task.updateTask(task.id, { remindAt: new Date(Date.now() + 3_600_000).toISOString() })
  const reset = await services.task.getTask(task.id)
  assert.equal(reset.reminderAckedAt, null)
  assert.equal(reset.remindedAt, null)
})

test('CSV 导入把旧收件箱状态归一为 todo', async () => {
  const result = services.backup.parseTasksCsv(
    '标题,状态\n旧收件箱,收件箱\n英文Inbox,inbox\n待整理项,待整理\n空状态,\n正常项,todo\n',
  )
  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.rows.map((r) => r.status), ['todo', 'todo', 'todo', 'todo', 'todo'])
})

test('工作台区块配置过滤已下线的 urgent_temp 并写回', async () => {
  const db = getDB()
  // 测试环境不跑前端 seed，用服务层取（会自动初始化默认设置）
  const current = await services.settings.getSettings()
  await db.settings.put({
    ...current,
    dashboardBlocks: [
      { type: 'must_finish_today', visible: true, order: 0 },
      { type: 'urgent_temp', visible: true, order: 1 },
      { type: 'this_week', visible: true, order: 2 },
      { type: 'long_term', visible: true, order: 3 },
      { type: 'daily_routine', visible: true, order: 4 },
    ],
  })
  const blocks = await services.settings.getDashboardBlocks()
  assert.deepEqual(blocks.map((b) => b.type), ['must_finish_today', 'this_week', 'long_term', 'daily_routine'])
  assert.deepEqual(blocks.map((b) => b.order), [0, 1, 2, 3])
  const persisted = await db.settings.toCollection().first()
  assert.ok(!persisted.dashboardBlocks.some((b) => b.type === 'urgent_temp'), '脏数据应已写回清理')
})

test('导入旧备份时迁移 inbox 任务并清理临时收件箱区块', async () => {
  const now = new Date().toISOString()
  const legacy = {
    version: '1.0.0',
    exportedAt: now,
    tasks: [{
      id: 'legacy-inbox-task',
      userId: 'default-user',
      title: '旧收件箱任务',
      description: '',
      priority: 'P1',
      status: 'inbox',
      source: 'inbox',
      scheduledDate: null,
      dueDate: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      archivedAt: null,
    }],
    workLogs: [],
    workLogTasks: [],
    notes: [],
    projects: [],
    categories: [],
    recurrences: [],
    taskHistories: [],
    settings: {
      id: 'default-user-settings',
      userId: 'default-user',
      dashboardBlocks: [
        { type: 'must_finish_today', visible: true, order: 0 },
        { type: 'urgent_temp', visible: true, order: 1 },
        { type: 'this_week', visible: true, order: 2 },
        { type: 'long_term', visible: true, order: 3 },
        { type: 'daily_routine', visible: true, order: 4 },
      ],
    },
  }
  assert.deepEqual(services.backup.validateBackup(legacy).errors, [])
  await services.backup.importBackup(legacy)
  const task = await getDB().tasks.get('legacy-inbox-task')
  assert.equal(task.status, 'todo')
  assert.equal(task.source, 'note')
  const settings = await getDB().settings.toCollection().first()
  assert.deepEqual(settings.dashboardBlocks.map((b) => b.type), ['must_finish_today', 'this_week', 'long_term', 'daily_routine'])
  assert.deepEqual(settings.dashboardBlocks.map((b) => b.order), [0, 1, 2, 3])
})
