<template>
  <div class="daily-plan">
    <div class="page-header">
      <div class="date-nav">
        <button class="nav-btn" @click="changeDate(-1)">‹</button>
        <div class="date-display">
          <label class="date-title date-picker">{{ fullDateDescription(selectedDate) }}
            <input type="date" aria-label="选择计划日期" :value="selectedDate" @change="pickDate" />
          </label>
          <button v-if="!isToday" class="back-today" @click="goToday">返回今天</button>
        </div>
        <button class="nav-btn" @click="changeDate(1)">›</button>
      </div>
      <button class="add-btn" @click="showTaskModal = true">＋ 新增任务</button>
    </div>

    <!-- 当天任务 -->
    <div class="plan-section">
      <div class="section-header">
        <h3 class="section-title">当天任务 ({{ dayTasks.length }})</h3>
      </div>
      <div v-if="dayTasks.length === 0" class="empty-state">
        <div class="empty-state-icon">▦</div>
        <div class="empty-state-text">当天没有计划任务</div>
      </div>
      <div v-else class="task-list">
        <TaskItem
          v-for="task in dayTasks"
          :key="task.id"
          :task="task"
          :show-priority="true"
          :show-status="true"
          :show-actions="true"
          @click="handleTaskClick"
          @complete="handleComplete"
          @reopen="handleReopen"
          @move-tomorrow="handleMoveTomorrow"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- 当天工作日志 -->
    <div class="plan-section">
      <div class="section-header">
        <h3 class="section-title">当天工作日志 ({{ dayLogs.length }})</h3>
        <button class="section-action" @click="showLogModal = true">新增记录</button>
      </div>
      <div v-if="dayLogs.length === 0" class="empty-state">
        <div class="empty-state-text">当天没有工作日志</div>
      </div>
      <div v-else class="log-list">
        <div v-for="log in dayLogs" :key="log.id" class="log-item">
          <span class="log-title">{{ log.title }}</span>
          <span class="log-time">{{ formatDateTime(log.createdAt, 'HH:mm') }}</span>
        </div>
      </div>
    </div>

    <!-- 结束当天整理 -->
    <button v-if="hasUnfinishedTasks" class="end-day-btn" @click="showEndDay = true">
      结束当天整理 ({{ unfinishedTasks.length }} 项未完成)
    </button>

    <!-- 结束当天弹窗 -->
    <NModal
      v-model:show="showEndDay"
      preset="card"
      title="结束当天整理"
      :style="{ width: '560px', maxWidth: '90vw' }"
      :bordered="false"
    >
      <div class="end-day-content">
        <p class="end-day-hint">以下 {{ unfinishedTasks.length }} 项任务未完成，请选择处理方式：</p>
        <div class="unfinished-list">
          <div v-for="task in unfinishedTasks" :key="task.id" class="unfinished-item">
            <span class="unfinished-title">{{ task.title }}</span>
            <div class="unfinished-actions">
              <button :class="['ua-btn', { active: endDayChoices[task.id] === 'tomorrow' }]" @click="endDayChoices[task.id] = 'tomorrow'">明天</button>
              <button :class="['ua-btn', { active: endDayChoices[task.id] === 'week' }]" @click="endDayChoices[task.id] = 'week'">指定日期</button>
              <input v-if="endDayChoices[task.id] === 'week'" type="date" aria-label="新的计划日期" v-model="targetDates[task.id]" />
              <button :class="['ua-btn', { active: endDayChoices[task.id] === 'hold' }]" @click="endDayChoices[task.id] = 'hold'">搁置</button>
              <button :class="['ua-btn', { active: endDayChoices[task.id] === 'keep' }]" @click="endDayChoices[task.id] = 'keep'">保留</button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton @click="showEndDay = false">取消</NButton>
          <NButton type="primary" @click="handleEndDay">确认</NButton>
        </div>
      </template>
    </NModal>

    <TaskCreateModal :initial-date="selectedDate" v-model:show="showTaskModal" @created="handleCreated" />
    <WorkLogCreateModal v-model:show="showLogModal" @created="handleLogCreated" />
    <TaskDetailDrawer v-model:show="detailVisible" :task="selectedTask" @updated="handleUpdated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { NModal, NButton, useMessage } from 'naive-ui'
import { useTaskStore } from '@/stores/task'
import { useWorkLogStore } from '@/stores/worklog'
import { useDashboardStore } from '@/stores/dashboard'
import type { Task } from '@/types'
import { fullDateDescription, formatDate, formatDateTime, dayjs, addDays, todayLocal } from '@/utils/date'
import TaskItem from '@/components/common/TaskItem.vue'
import TaskCreateModal from '@/components/common/TaskCreateModal.vue'
import WorkLogCreateModal from '@/components/common/WorkLogCreateModal.vue'
import TaskDetailDrawer from '@/components/common/TaskDetailDrawer.vue'
import { useServices } from '@/services'

const message = useMessage()
const taskStore = useTaskStore()
const workLogStore = useWorkLogStore()
const dashboardStore = useDashboardStore()
const services = useServices()

const selectedDate = ref(todayLocal())
const showTaskModal = ref(false)
const showLogModal = ref(false)
const showEndDay = ref(false)
const detailVisible = ref(false)
const selectedTask = ref<Task | null>(null)
const dayLogs = ref<import('@/types').WorkLog[]>([])
const targetDates = ref<Record<string, string>>({})
const endDayChoices = ref<Record<string, string>>({})

const isToday = computed(() => selectedDate.value === todayLocal())

const dayTasks = computed(() =>
  taskStore.tasks.filter((t) => {
    if (!t.scheduledDate) return false
    return formatDate(t.scheduledDate) === selectedDate.value
  }),
)

const unfinishedTasks = computed(() =>
  dayTasks.value.filter((t) => t.status !== 'completed' && t.status !== 'cancelled'),
)

const hasUnfinishedTasks = computed(() => unfinishedTasks.value.length > 0)

async function loadDayData() {
  dayLogs.value = await services.workLog.getByDate(selectedDate.value)
}

function pickDate(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) selectedDate.value = value
}

function changeDate(offset: number) {
  const d = dayjs(selectedDate.value).add(offset, 'day')
  selectedDate.value = d.format('YYYY-MM-DD')
}

function goToday() {
  selectedDate.value = todayLocal()
}

function handleTaskClick(task: Task) {
  selectedTask.value = task
  detailVisible.value = true
}

async function handleComplete(task: Task) {
  await taskStore.completeTask(task.id)
  message.success('任务已完成')
  await dashboardStore.loadDashboard()
}

async function handleReopen(task: Task) {
  await taskStore.reopenTask(task.id)
  message.info('任务已重新打开')
  await dashboardStore.loadDashboard()
}

async function handleMoveTomorrow(task: Task) {
  await taskStore.rescheduleTask(task.id, addDays(selectedDate.value, 1))
  message.success('已移至明天')
  await dashboardStore.loadDashboard()
}

async function handleDelete(task: Task) {
  await taskStore.deleteTask(task.id)
  message.success('任务已删除')
  await dashboardStore.loadDashboard()
}

async function handleCreated() {
  await taskStore.loadAll()
  await dashboardStore.loadDashboard()
  await loadDayData()
}

async function handleLogCreated() {
  await workLogStore.loadToday()
  await loadDayData()
}

async function handleUpdated() {
  await taskStore.loadAll()
  await dashboardStore.loadDashboard()
}

async function handleEndDay() {
  if (unfinishedTasks.value.some(t => endDayChoices.value[t.id] === 'week' && !targetDates.value[t.id])) {
    message.warning('请选择新的计划日期')
    return
  }
  for (const task of unfinishedTasks.value) {
    const choice = endDayChoices.value[task.id] ?? 'keep'
    switch (choice) {
      case 'tomorrow':
        await taskStore.rescheduleTask(task.id, addDays(selectedDate.value, 1))
        break
      case 'week':
        await taskStore.rescheduleTask(task.id, targetDates.value[task.id])
        break
      case 'hold':
        await taskStore.holdTask(task.id)
        break
      case 'keep':
      default:
        break
    }
  }
  message.success('当天整理完成')
  showEndDay.value = false
  endDayChoices.value = {}
  await taskStore.loadAll()
  await dashboardStore.loadDashboard()
}

watch(selectedDate, () => {
  loadDayData()
})

watch(unfinishedTasks, (tasks) => {
  for (const t of tasks) {
    if (!endDayChoices.value[t.id]) {
      endDayChoices.value[t.id] = 'keep'
    }
  }
})

onMounted(() => {
  loadDayData()
})
</script>

<style scoped>
.date-picker { display: block; position: relative; }
.date-picker input { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; }
.date-picker input::-webkit-calendar-picker-indicator { position: absolute; inset: 0; width: 100%; cursor: pointer; }
.daily-plan {
  width: 100%;
  padding: 32px 40px 64px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  gap: 16px;
}

.date-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.date-display {
  text-align: center;
}

.date-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.back-today {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  margin-top: 2px;
}

.add-btn {
  padding: 8px 16px;
  background-color: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--font-size-sm);
  cursor: pointer;
  white-space: nowrap;
}

.add-btn:hover {
  background-color: var(--color-primary-hover);
}

.plan-section {
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.section-action {
  border: 1px solid var(--color-border);
  background-color: transparent;
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.log-title {
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.log-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.end-day-btn {
  width: 100%;
  padding: 12px;
  border: 1px dashed var(--color-warning);
  background-color: var(--color-warning-light);
  border-radius: var(--radius-md);
  color: var(--color-warning);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.end-day-btn:hover {
  background-color: var(--color-warning);
  color: white;
}

.end-day-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.unfinished-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unfinished-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.unfinished-title {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  flex: 1;
}

.unfinished-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.ua-btn {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  background-color: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.ua-btn.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .daily-plan {
    padding: 20px 14px 48px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .unfinished-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
