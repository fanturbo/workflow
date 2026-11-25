<template>
  <Transition name="rc-pop">
    <aside v-if="alerts.length > 0" class="reminder-center" :class="{ 'is-pulsing': pulsing }" aria-label="待处理提醒">
      <header class="rc-header">
        <span class="rc-mark" aria-hidden="true"></span>
        <div class="rc-heading">
          <span class="rc-title">待处理提醒</span>
          <span class="rc-count">{{ alerts.length }}</span>
        </div>
        <button class="rc-all" type="button" @click="handleAckAll">全部忽略</button>
      </header>

      <div class="rc-list">
        <article
          v-for="task in alerts"
          :key="task.id"
          class="rc-item"
          :style="{ '--rc-accent': PRIORITY_CONFIGS[task.priority].color }"
        >
          <div class="rc-item-main">
            <div class="rc-item-title" :title="task.title">{{ task.title }}</div>
            <div class="rc-item-meta">
              <PriorityTag :priority="task.priority" />
              <span class="rc-time">{{ formatDateTime(task.remindAt ?? null, 'MM-DD HH:mm') }}</span>
              <span v-if="task.description" class="rc-desc" :title="task.description">{{ task.description }}</span>
            </div>
          </div>
          <div class="rc-actions">
            <button class="rc-btn rc-btn-ghost" type="button" @click="handleSnooze(task.id)">稍后 10 分钟</button>
            <button class="rc-btn rc-btn-primary" type="button" @click="handleAck(task.id)">知道了</button>
          </div>
        </article>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import PriorityTag from './PriorityTag.vue'
import { useReminderStore } from '@/stores/reminder'
import { PRIORITY_CONFIGS } from '@/constants/task'
import { formatDateTime } from '@/utils/date'

const store = useReminderStore()
const { alerts } = storeToRefs(store)
const pulsing = ref(false)
let pulseTimer: number | undefined

watch(() => store.pulseKey, () => {
  pulsing.value = false
  window.clearTimeout(pulseTimer)
  // 强制重排让动画能重复触发
  window.requestAnimationFrame(() => {
    pulsing.value = true
    pulseTimer = window.setTimeout(() => { pulsing.value = false }, 1600)
  })
})

function handleAck(id: string) { void store.ack(id) }
function handleAckAll() { void store.ackAll() }
function handleSnooze(id: string) { void store.snooze(id, 10) }

onMounted(() => { void store.refresh() })
onUnmounted(() => window.clearTimeout(pulseTimer))
</script>

<style scoped>
.reminder-center {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1250;
  width: 372px;
  max-width: calc(100vw - 32px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  transition: box-shadow var(--transition-base), border-color var(--transition-base);
}

.reminder-center.is-pulsing {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg), 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.rc-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-light);
}

.rc-mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 14%, transparent);
  flex: none;
}

.rc-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.rc-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.rc-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.rc-all {
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  padding: 4px 2px;
  white-space: nowrap;
  transition: color var(--transition-fast);
}

.rc-all:hover { color: var(--color-text); }

.rc-list {
  max-height: 340px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.rc-item {
  position: relative;
  padding: 13px 16px 13px 19px;
  border-bottom: 1px solid var(--color-border-light);
}

.rc-item:last-child { border-bottom: none; }

.rc-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--rc-accent);
  opacity: 0.85;
}

.rc-item-main { min-width: 0; }

.rc-item-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rc-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
  min-width: 0;
}

.rc-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.rc-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.rc-actions {
  display: flex;
  gap: 8px;
  margin-top: 11px;
}

.rc-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.rc-btn-ghost {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
}

.rc-btn-ghost:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.rc-btn-primary {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.rc-btn-primary:hover { background: var(--color-primary-hover); border-color: var(--color-primary-hover); }

.rc-pop-enter-active, .rc-pop-leave-active { transition: opacity 220ms ease, transform 220ms ease; }
.rc-pop-enter-from, .rc-pop-leave-to { opacity: 0; transform: translateY(14px); }

@media (max-width: 640px) {
  .reminder-center { right: 16px; bottom: 16px; }
}
</style>
