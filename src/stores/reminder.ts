/**
 * 提醒状态
 * 待确认提醒持久化在 IndexedDB，这里只做响应式投影，刷新后由 ReminderHost 重新拉起
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useServices } from '@/services'
import type { Task } from '@/types'

export const useReminderStore = defineStore('reminder', () => {
  const services = useServices()

  const alerts = ref<Task[]>([])
  /** 每次有新提醒到达时 +1，供浮层做一次轻微高亮 */
  const pulseKey = ref(0)

  async function refresh() {
    alerts.value = await services.reminder.getActiveAlerts()
  }

  /** 由轮询宿主直接写入本次扫描结果，省一次 DB 往返 */
  function setAlerts(list: Task[]) {
    alerts.value = list
  }

  async function ack(taskId: string) {
    await services.reminder.ack(taskId)
    await refresh()
  }

  async function ackAll() {
    await services.reminder.ackAll()
    await refresh()
  }

  async function snooze(taskId: string, minutes = 10) {
    await services.reminder.snooze(taskId, minutes)
    await refresh()
  }

  return {
    alerts,
    pulseKey,
    refresh,
    setAlerts,
    ack,
    ackAll,
    snooze,
  }
})
