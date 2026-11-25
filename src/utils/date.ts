/**
 * 统一日期处理
 * 所有时间存储为 ISO UTC 字符串
 * 展示时按用户时区转换
 */

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isToday from 'dayjs/plugin/isToday'
import isBetween from 'dayjs/plugin/isBetween'
import isoWeek from 'dayjs/plugin/isoWeek'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isToday)
dayjs.extend(isBetween)
dayjs.extend(isoWeek)
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/** 默认时区 */
export function getDefaultTimezone(): string {
  return dayjs.tz.guess() || 'Asia/Shanghai'
}

/** 获取当前 UTC ISO 字符串 */
export function nowUtc(): string {
  return dayjs.utc().toISOString()
}

/** 将日期字符串转为 UTC ISO */
export function toUtc(date: Date | string | null): string | null {
  if (!date) return null
  return dayjs(date).utc().toISOString()
}

/** 从 UTC ISO 转为本地 dayjs 对象 */
export function fromUtc(dateStr: string | null): dayjs.Dayjs | null {
  if (!dateStr) return null
  return dayjs.utc(dateStr).local()
}

/** 格式化日期为本地展示 */
export function formatDate(dateStr: string | null, format = 'YYYY-MM-DD'): string {
  if (!dateStr) return ''
  return dayjs.utc(dateStr).local().format(format)
}

/** 格式化日期时间 */
export function formatDateTime(dateStr: string | null, format = 'YYYY-MM-DD HH:mm'): string {
  if (!dateStr) return ''
  return dayjs.utc(dateStr).local().format(format)
}

/** 获取今天的本地日期（仅日期部分 YYYY-MM-DD） */
export function todayLocal(): string {
  return dayjs().format('YYYY-MM-DD')
}

/** 获取指定日期的本地格式 */
export function toLocalDate(date: Date | string | dayjs.Dayjs): string {
  return dayjs(date).format('YYYY-MM-DD')
}

/** 获取本周一 */
export function startOfWeek(date: Date | string = new Date()): string {
  return dayjs(date).startOf('isoWeek').format('YYYY-MM-DD')
}

/** 获取本周日 */
export function endOfWeek(date: Date | string = new Date()): string {
  return dayjs(date).endOf('isoWeek').format('YYYY-MM-DD')
}

/** 判断日期是否为今天 */
export function isTodayDate(dateStr: string | null): boolean {
  if (!dateStr) return false
  return dayjs.utc(dateStr).local().isToday()
}

/** 判断日期是否在本周 */
export function isThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = dayjs.utc(dateStr).local()
  return d.isBetween(startOfWeek(), endOfWeek(), 'day', '[]')
}

/** 判断日期是否在过去 */
export function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false
  return dayjs.utc(dateStr).local().isBefore(dayjs().startOf('day'))
}

/** 获取相对时间描述 */
export function fromNow(dateStr: string | null): string {
  if (!dateStr) return ''
  return dayjs.utc(dateStr).local().fromNow()
}

/** 添加天数 */
export function addDays(date: Date | string, days: number): string {
  return dayjs(date).add(days, 'day').format('YYYY-MM-DD')
}

/** 明天的日期 */
export function tomorrow(): string {
  return dayjs().add(1, 'day').format('YYYY-MM-DD')
}

/** 日期范围内是否包含某天 */
export function dateInRange(dateStr: string, start: string, end: string): boolean {
  return dayjs(dateStr).isBetween(start, end, 'day', '[]')
}

/** 获取星期几的中文 */
export function weekdayName(date: Date | string | dayjs.Dayjs): string {
  const names = ['日', '一', '二', '三', '四', '五', '六']
  return `星期${names[dayjs(date).day()]}`
}

/** 获取完整日期描述：2024年11月5日 星期四 */
export function fullDateDescription(date: Date | string = new Date()): string {
  const d = dayjs(date)
  return `${d.format('YYYY年MM月DD日')} ${weekdayName(d as dayjs.Dayjs)}`
}

/** 获取最近 N 天的日期范围（本地） */
export function lastNDays(n: number): { start: string; end: string } {
  return {
    start: dayjs().subtract(n - 1, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  }
}

/** 获取日期范围内的所有日期 */
export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  let current = dayjs(start)
  const endDay = dayjs(end)
  while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
    dates.push(current.format('YYYY-MM-DD'))
    current = current.add(1, 'day')
  }
  return dates
}

/** 检查是否是工作日 */
export function isWorkday(date: Date | string): boolean {
  const day = dayjs(date).day()
  return day !== 0 && day !== 6
}

export { dayjs }
