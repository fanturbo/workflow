/**
 * 表单校验规则
 */

import type { FormRules } from 'naive-ui'
import { isEmpty } from './index'

/** 必填校验 */
export function required(message: string) {
  return {
    required: true,
    message,
    trigger: ['blur', 'input'],
  }
}

/** 任务标题校验 */
export const taskTitleRules: FormRules = {
  title: {
    required: true,
    message: '请输入任务名称',
    trigger: ['blur', 'input'],
  },
}

/** 项目名称校验 */
export const projectNameRules: FormRules = {
  name: {
    required: true,
    message: '请输入项目名称',
    trigger: ['blur', 'input'],
  },
}

/** 工作日志标题校验 */
export const workLogTitleRules: FormRules = {
  title: {
    required: true,
    message: '请输入日志标题',
    trigger: ['blur', 'input'],
  },
}

/** 分类名称校验 */
export const categoryNameRules: FormRules = {
  name: {
    required: true,
    message: '请输入分类名称',
    trigger: ['blur', 'input'],
  },
}

/** 周期任务校验 */
export const recurrenceRules: FormRules = {
  title: {
    required: true,
    message: '请输入任务标题',
    trigger: ['blur', 'input'],
  },
  startDate: {
    required: true,
    message: '请选择开始日期',
    trigger: ['change'],
  },
}

/** 通用非空检查 */
export function notEmpty(value: unknown): boolean {
  return !isEmpty(value)
}

/** 日期顺序校验 */
export function dateOrderValid(start: string | null, end: string | null): boolean {
  if (!start || !end) return true
  return new Date(start).getTime() <= new Date(end).getTime()
}
