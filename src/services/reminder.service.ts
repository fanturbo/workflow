/**
 * 提醒服务
 * 纯前端单机模式：页面打开期间到点触发（常驻浮层 + 桌面通知 + 提示音）
 * 提醒状态落在 IndexedDB，未手动确认前刷新后仍会恢复；页面关闭后无法执行 JS，
 * 长期提醒建议用 downloadIcs 交给系统日历
 */

import { getRepositories } from '@/db/repositories'
import { CURRENT_USER_ID } from '@/db/database'
import type { Task } from '@/types'
import { TERMINAL_STATUSES } from '@/constants/task'
import { dayjs, nowUtc } from '@/utils/date'

/** 一次检查的结果 */
export interface DueResult {
  /** 本次要响铃的任务 */
  hits: Task[]
  /** 仍待确认、需要常驻展示的任务 */
  active: Task[]
  /** 首次到期的任务 id（桌面通知只发一次，避免重复轰炸） */
  firstTime: string[]
}

/** 默认重复提醒间隔（秒） */
export const DEFAULT_REPEAT_SEC = 60

/** 是否为「到期但尚未确认」的任务 */
function isPendingAlert(t: Task, now: number): boolean {
  return (
    t.userId === CURRENT_USER_ID &&
    !!t.remindAt &&
    !t.reminderAckedAt &&
    !t.archivedAt &&
    !TERMINAL_STATUSES.includes(t.status) &&
    new Date(t.remindAt).getTime() <= now
  )
}

export class ReminderService {
  /**
   * 扫描到点提醒。
   * 旧实现命中即写 remindedAt 并永久静音 → 只响一声、刷新即丢。
   * 现在 remindedAt 只作「首次触发」展示，lastRemindedAt 控制重复间隔，
   * 真正的结束条件是用户手动写 reminderAckedAt。
   */
  async checkDue(repeatSec = DEFAULT_REPEAT_SEC, repeatEnabled = true): Promise<DueResult> {
    const repos = getRepositories()
    const now = Date.now()
    const tasks = await repos.tasks.getAll()
    const pending = tasks.filter((t) => isPendingAlert(t, now))
    // 延后未到点的暂不展示、不响铃
    const active = pending
      .filter((t) => !t.reminderSnoozeUntil || new Date(t.reminderSnoozeUntil).getTime() <= now)
      .sort((a, b) => new Date(a.remindAt!).getTime() - new Date(b.remindAt!).getTime())

    const intervalMs = Math.max(5, repeatSec) * 1000
    const hits = active.filter((t) => {
      if (!t.remindedAt) return true // 首次到期
      if (!repeatEnabled) return false
      const last = new Date(t.lastRemindedAt ?? t.remindedAt).getTime()
      return now - last >= intervalMs
    })
    // 写库前记录哪些是首次到期
    const firstTime = hits.filter((t) => !t.remindedAt).map((t) => t.id)

    const stamp = nowUtc()
    for (const t of hits) {
      await repos.tasks.update(t.id, {
        remindedAt: t.remindedAt ?? stamp,
        lastRemindedAt: stamp,
        reminderSnoozeUntil: null,
      })
    }
    return { hits, active, firstTime }
  }

  /** 当前所有待确认提醒（供常驻浮层刷新后恢复，不触发响铃） */
  async getActiveAlerts(): Promise<Task[]> {
    const tasks = await getRepositories().tasks.getAll()
    const now = Date.now()
    return tasks
      .filter((t) => isPendingAlert(t, now))
      .filter((t) => !t.reminderSnoozeUntil || new Date(t.reminderSnoozeUntil).getTime() <= now)
      .sort((a, b) => new Date(a.remindAt!).getTime() - new Date(b.remindAt!).getTime())
  }

  /** 手动确认（关闭）单条提醒 */
  async ack(taskId: string): Promise<void> {
    await getRepositories().tasks.update(taskId, {
      reminderAckedAt: nowUtc(),
      reminderSnoozeUntil: null,
    })
  }

  /** 批量确认；不传则确认全部待处理提醒 */
  async ackAll(taskIds?: string[]): Promise<void> {
    const ids = taskIds ?? (await this.getActiveAlerts()).map((t) => t.id)
    await Promise.all(ids.map((id) => this.ack(id)))
  }

  /** 稍后提醒：到点前不弹不响，到点立即重新响一声 */
  async snooze(taskId: string, minutes = 10): Promise<void> {
    await getRepositories().tasks.update(taskId, {
      reminderSnoozeUntil: new Date(Date.now() + minutes * 60_000).toISOString(),
      lastRemindedAt: null,
    })
  }

  /** 桌面通知权限状态 */
  getPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  }

  /** 申请桌面通知权限（必须在用户点击手势中调用） */
  async ensurePermission(): Promise<boolean> {
    const state = this.getPermissionState()
    if (state === 'unsupported' || state === 'denied') return false
    if (state === 'granted') return true
    return (await Notification.requestPermission()) === 'granted'
  }

  /** 桌面通知（未授权或环境不支持时静默跳过） */
  fireDesktopNotification(task: Task): void {
    if (this.getPermissionState() !== 'granted') return
    try {
      new Notification(`提醒：${task.title}`, {
        body: task.description || '该处理这个任务了',
        tag: task.id,
      })
    } catch {
      // 无窗口 WebView 等环境构造 Notification 会抛错，忽略
    }
  }

  /** 提示音（Web Audio 合成，无需音频文件） */
  playSound(): void {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      // A5 → C#6 双音提示
      ;[880, 1108.73].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        const start = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.55)
      })
      window.setTimeout(() => void ctx.close(), 1200)
    } catch {
      // 音频不可用时静默
    }
  }

  /** 导出 .ics 日历文件（页面关闭也能响的兜底方案，交给系统日历） */
  downloadIcs(task: Task): void {
    const start = task.remindAt ?? task.dueDate ?? task.scheduledDate
    if (!start) return
    const dtStart = dayjs.utc(start)
    const dtEnd = dtStart.add(30, 'minute')
    const fmt = (d: dayjs.Dayjs) => d.format('YYYYMMDD[T]HHmmss[Z]')
    const esc = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WorkFlow//Reminder//CN',
      'BEGIN:VEVENT',
      `UID:${task.id}@workflow`,
      `DTSTAMP:${fmt(dayjs.utc())}`,
      `DTSTART:${fmt(dtStart)}`,
      `DTEND:${fmt(dtEnd)}`,
      `SUMMARY:${esc(task.title)}`,
      task.description ? `DESCRIPTION:${esc(task.description)}` : '',
      'BEGIN:VALARM',
      'TRIGGER:-PT0M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(task.title)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.title.replace(/[\\/:*?"<>|]/g, '_')}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }
}
