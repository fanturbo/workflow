<template>
  <!-- 无 UI 宿主：挂载到点提醒轮询，浮层由 ReminderCenter 渲染 -->
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useServices } from '@/services'
import { useSettingsStore } from '@/stores/settings'
import { useReminderStore } from '@/stores/reminder'
import { useTaskStore } from '@/stores/task'
import { DEFAULT_REPEAT_SEC } from '@/services/reminder.service'

const services = useServices()
const settingsStore = useSettingsStore()
const reminderStore = useReminderStore()
const taskStore = useTaskStore()

const TICK_MS = 10000
let timer: number | undefined
let ticking = false

async function tick() {
  if (ticking) return
  ticking = true
  try {
    const s = settingsStore.settings
    if ((s?.reminderEnabled ?? true) === false) {
      reminderStore.setAlerts([])
      return
    }

    const repeatEnabled = s?.reminderRepeat ?? true
    const repeatSec = s?.reminderRepeatSec ?? DEFAULT_REPEAT_SEC
    const { hits, active, firstTime } = await services.reminder.checkDue(repeatSec, repeatEnabled)
    // 未确认提醒写回 store，刷新后由 onMounted 重新拉起，弹窗不再随页面消失
    reminderStore.setAlerts(active)

    if (hits.length === 0) return

    reminderStore.pulseKey++
    // 未确认前按间隔重复响铃；桌面通知只在首次到期发送，避免重复轰炸
    if (s?.reminderSound !== false) services.reminder.playSound()
    for (const t of hits) {
      if (firstTime.includes(t.id)) services.reminder.fireDesktopNotification(t)
    }
    await taskStore.loadAll()
  } finally {
    ticking = false
  }
}

function onVisible() {
  if (!document.hidden) void tick()
}

onMounted(() => {
  // 后台标签页定时器会被浏览器节流（最低约 1 分钟），绝对时间戳比对保证不丢提醒
  timer = window.setInterval(tick, TICK_MS)
  document.addEventListener('visibilitychange', onVisible)
  void reminderStore.refresh()
  void tick()
})

onUnmounted(() => {
  window.clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>
