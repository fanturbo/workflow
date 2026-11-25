<template>
  <div class="dashboard">
    <!-- 顶部 -->
    <div class="dashboard-top">
      <div class="top-left">
        <h2 class="welcome-title">{{ fullDateDescription() }}</h2>
        <p class="welcome-text">{{ greeting }}</p>
      </div>
      <div class="overview-cards">
        <div class="overview-card">
          <div class="overview-num">{{ overview.todayPending }}</div>
          <div class="overview-label">待完成</div>
        </div>
        <div class="overview-card">
          <div class="overview-num completed">{{ overview.todayCompleted }}</div>
          <div class="overview-label">已完成</div>
        </div>
        <div class="overview-card">
          <div class="overview-num overdue">{{ overview.todayOverdue }}</div>
          <div class="overview-label">逾期</div>
        </div>
      </div>
      <div class="top-right">
        <button class="quick-btn primary" @click="showTaskModal = true">
          <span>＋</span> 快速新增任务
        </button>
        <button class="quick-btn" @click="showLogModal = true">
          <span>✎</span> 新增工作记录
        </button>
      </div>
    </div>

    <!-- 任务区块 -->
    <div class="dashboard-blocks">
      <draggable
        v-model="draggableBlocks"
        class="block-grid"
        item-key="type"
        handle=".block-header"
        animation="200"
        ghost-class="block-ghost"
        @end="handleBlockReorder"
      >
        <template #item="{ element: block }">
          <DashboardBlock
            :block="block"
            :tasks="blockTasks[block.type as DashboardBlockType] || []"
            :droppable="block.type !== 'daily_routine'"
            @task-click="handleTaskClick"
            @task-complete="handleComplete"
            @task-reopen="handleReopen"
            @task-move-tomorrow="handleMoveTomorrow"
            @task-delete="handleDelete"
            @quick-add="handleBlockQuickAdd"
            @task-drop="handleTaskDrop"
          />
        </template>
      </draggable>
    </div>

    <section v-if="dashboardStore.todayResults.length" class="log-section">
      <h3 class="section-title">今日完成</h3>
      <div v-for="task in dashboardStore.todayResults" :key="task.id + task.completedAt" class="log-card">
        ✓ {{ task.title }} <span class="log-card-time">{{ formatDateTime(task.completedAt, 'HH:mm') }}</span>
      </div>
    </section>
    <!-- 随记区域 -->
    <div class="log-section">
      <div class="section-header">
        <h3 class="section-title">今日随记</h3>
        <button class="section-action" @click="goToNotes">查看全部</button>
      </div>
      <div class="note-quick-add">
        <input
          v-model="quickNote"
          class="note-quick-input"
          placeholder="记一句话、一个想法，按 Enter 保存..."
          @keydown.enter="handleQuickNoteAdd"
        />
      </div>
      <div v-if="noteStore.todayNotes.length === 0" class="empty-state">
        <div class="empty-state-icon">✎</div>
        <div class="empty-state-text">今天还没有随记</div>
      </div>
      <div v-else class="note-list">
        <div v-for="note in noteStore.todayNotes" :key="note.id" class="note-card" @click="openNoteEdit(note)">
          <div class="note-card-header">
            <span class="note-card-time">{{ formatDateTime(note.createdAt, 'HH:mm') }}</span>
            <div class="note-card-right">
              <span v-if="noteBadge(note)" class="note-badge">{{ noteBadge(note) }}</span>
              <NPopconfirm @positive-click="() => handleDeleteNote(note)">
                <template #trigger>
                  <button class="note-delete" title="删除随记" @click.stop>删除</button>
                </template>
                确定删除这条随记吗？删除后不可恢复。
              </NPopconfirm>
            </div>
          </div>
          <div class="note-card-content">{{ note.content }}</div>
        </div>
      </div>
    </div>

    <!-- 日志区域 -->
    <div class="log-section">
      <div class="section-header">
        <h3 class="section-title">今日工作记录</h3>
        <button class="section-action" @click="showLogModal = true">新增记录</button>
      </div>
      <div v-if="todayLogs.length === 0" class="empty-state">
        <div class="empty-state-icon">✎</div>
        <div class="empty-state-text">今天还没有工作记录</div>
      </div>
      <div v-else class="log-list">
        <div v-for="log in todayLogs" :key="log.id" class="log-card" @click="goToWorkLogs">
          <div class="log-card-header">
            <span class="log-card-title">{{ log.title }}</span>
            <span class="log-card-time">{{ formatDateTime(log.createdAt, 'HH:mm') }}</span>
          </div>
          <div v-if="log.content" class="log-card-content">{{ log.content }}</div>
          <div v-if="log.result" class="log-card-result">成果：{{ log.result }}</div>
        </div>
      </div>
    </div>

    <!-- 弹窗 -->
    <TaskCreateModal v-model:show="showTaskModal" @created="handleCreated" />
    <WorkLogCreateModal v-model:show="showLogModal" @created="handleLogCreated" />
    <NoteCaptureModal v-model:show="noteEditVisible" :note="editingNote" @updated="handleNoteUpdated" @deleted="handleNoteUpdated" />
    <TaskDetailDrawer v-model:show="detailVisible" :task="selectedTask" @updated="handleUpdated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, NPopconfirm } from 'naive-ui'
import draggable from 'vuedraggable'
import { useDashboardStore } from '@/stores/dashboard'
import { useServices } from '@/services'
import { useTaskStore } from '@/stores/task'
import { useWorkLogStore } from '@/stores/worklog'
import { useNoteStore } from '@/stores/note'
import { useSettingsStore } from '@/stores/settings'
import { fullDateDescription, formatDateTime, dayjs } from '@/utils/date'
import type { Task, DashboardBlockType, Note } from '@/types'
import { DASHBOARD_BLOCK_CONFIGS } from '@/constants/task'
import DashboardBlock from './DashboardBlock.vue'
import TaskCreateModal from '@/components/common/TaskCreateModal.vue'
import WorkLogCreateModal from '@/components/common/WorkLogCreateModal.vue'
import NoteCaptureModal from '@/components/common/NoteCaptureModal.vue'
import TaskDetailDrawer from '@/components/common/TaskDetailDrawer.vue'

const router = useRouter()
const message = useMessage()
const dashboardStore = useDashboardStore()
const taskStore = useTaskStore()
const workLogStore = useWorkLogStore()
const noteStore = useNoteStore()
const settingsStore = useSettingsStore()

const showTaskModal = ref(false)
const showLogModal = ref(false)
const detailVisible = ref(false)
const selectedTask = ref<Task | null>(null)
const quickNote = ref('')
const noteEditVisible = ref(false)
const editingNote = ref<Note | null>(null)

const overview = computed(() => dashboardStore.overview)
const blockTasks = computed(() => dashboardStore.blockTasks)
const todayLogs = computed(() => workLogStore.todayLogs)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好，开始今天的工作吧'
  if (hour < 18) return '下午好，继续保持节奏'
  return '晚上好，记得整理今天的工作'
})

const visibleBlocks = computed(() => {
  return settingsStore.dashboardBlocks
    .filter((b) => b.visible)
    .sort((a, b) => a.order - b.order)
    .map((b) => ({
      type: b.type as DashboardBlockType,
      label: DASHBOARD_BLOCK_CONFIGS[b.type as DashboardBlockType].label,
      description: DASHBOARD_BLOCK_CONFIGS[b.type as DashboardBlockType].description,
    }))
})

// 拖拽排序的本地副本
const draggableBlocks = ref(visibleBlocks.value)

// 监听 visibleBlocks 变化时同步
watch(visibleBlocks, (val) => {
  draggableBlocks.value = val
})

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
  await taskStore.moveToTomorrow(task.id)
  message.success('已移至明天')
  await dashboardStore.loadDashboard()
}

async function handleDelete(task: Task) {
  await taskStore.deleteTask(task.id)
  message.success('任务已删除')
  await dashboardStore.loadDashboard()
}

/** 区块级快速新增：根据区块类型设置任务属性 */
async function handleBlockQuickAdd(title: string, blockType: DashboardBlockType) {
  const today = dayjs().format('YYYY-MM-DD')
  if (blockType === 'daily_routine') {
    const service = useServices().recurrence
    await service.createRecurrence({ title, frequency: 'daily', startDate: today })
    await service.generateTodayTasks()
    await handleCreated()
    message.success('已添加每日周期任务')
    return
  }
  const thisWeekDate = dayjs().endOf('isoWeek').format('YYYY-MM-DD')

  const blockDefaults: Record<DashboardBlockType, Partial<Task>> = {
    must_finish_today: { status: 'todo', scheduledDate: today, priority: 'P1' },
    this_week: { status: 'todo', scheduledDate: thisWeekDate },
    long_term: { status: 'todo' },
    daily_routine: { status: 'todo', scheduledDate: today },
  }

  const defaults = blockDefaults[blockType] || {}
  await taskStore.createTask({
    title,
    status: (defaults.status as Task['status']) ?? 'todo',
    scheduledDate: (defaults.scheduledDate as string) ?? null,
    priority: (defaults.priority as Task['priority']) ?? 'P2',
  })
  message.success('任务已添加')
  await taskStore.loadAll()
  await dashboardStore.loadDashboard()
}

async function handleBlockReorder() {
  const types = draggableBlocks.value.map((b) => b.type)
  await settingsStore.updateBlockOrder(types)
  message.success('区块顺序已保存')
}

/** 任务跨区块拖拽 — 根据目标区块更新任务属性 */
async function handleTaskDrop(task: Task, targetBlock: DashboardBlockType) {
  const today = dayjs().format('YYYY-MM-DD')
  const thisWeekEnd = dayjs().endOf('isoWeek').format('YYYY-MM-DD')

  const blockPatch: Record<DashboardBlockType, Partial<Task>> = {
    must_finish_today: { status: 'todo', scheduledDate: today },
    this_week: { status: 'todo', scheduledDate: thisWeekEnd },
    long_term: { status: 'todo', scheduledDate: null },
    daily_routine: { status: 'todo', scheduledDate: today },
  }

  const patch = blockPatch[targetBlock]
  if (!patch) return

  // 始终落库再重载：vuedraggable 已经改了本地 list，若不写 DB 就会留下
  // 「拖过去成功、刷新又弹回」的假象；即使属性没变也要走一次写入+重载来对齐 UI
  await taskStore.updateTask(task.id, patch)
  message.success(`已移至「${DASHBOARD_BLOCK_CONFIGS[targetBlock].label}」`)
  await dashboardStore.loadDashboard()
}

async function handleCreated() {
  await taskStore.loadAll()
  await dashboardStore.loadDashboard()
}

async function handleLogCreated() {
  await workLogStore.loadToday()
  await workLogStore.loadAll()
}

async function handleUpdated() {
  await taskStore.loadAll()
  await dashboardStore.loadDashboard()
}

function goToWorkLogs() {
  router.push('/work-logs')
}

function goToNotes() {
  router.push({ path: '/work-logs', query: { tab: 'notes' } })
}

async function handleQuickNoteAdd() {
  const content = quickNote.value.trim()
  if (!content) return
  await noteStore.createNote({ content })
  quickNote.value = ''
  message.success('已记录')
}

function openNoteEdit(note: Note) {
  editingNote.value = note
  noteEditVisible.value = true
}

async function handleDeleteNote(note: Note) {
  await noteStore.deleteNote(note.id)
  message.success('已删除')
}

async function handleNoteUpdated() {
  await noteStore.loadAll()
  await noteStore.loadToday()
}

function noteBadge(note: Note): string {
  const labels: string[] = []
  if (note.convertedTaskId) labels.push('已转任务')
  if (note.convertedWorkLogId) labels.push('已转记录')
  return labels.join(' · ')
}

onMounted(async () => {
  await dashboardStore.loadDashboard()
  await workLogStore.loadToday()
  await noteStore.loadToday()
})
</script>

<style scoped>
.dashboard {
  width: 100%;
  padding: 20px 40px 64px;
  max-width: 1440px;
  margin: 0 auto;
}

.dashboard-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 20px;
}

.top-left {
  min-width: 0;
}

.welcome-title {
  font-size: 21px;
  line-height: 1.25;
  letter-spacing: -0.015em;
  font-weight: 700;
  color: var(--color-text);
}

.welcome-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 3px;
}

.top-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.quick-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-1px);
}

.quick-btn.primary {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.2);
}

.quick-btn.primary:hover {
  background-color: var(--color-primary-hover);
}

.overview-cards {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  margin: 0 0 0 auto;
  flex-shrink: 0;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 10px;
  background: var(--color-surface);
  border: 0;
  border-radius: 9px;
}

.overview-num {
  font-size: 17px;
  line-height: 1;
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.overview-num.completed {
  color: var(--color-success);
}

.overview-num.overdue {
  color: var(--color-danger);
}

.overview-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 0;
  white-space: nowrap;
}

.dashboard-blocks {
  margin-bottom: 20px;
}

.block-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.block-grid > * {
  min-width: 0;
}

.block-ghost {
  opacity: 0.5;
}

.dashboard-blocks :deep(.dashboard-block .block-header) {
  cursor: grab;
}

.dashboard-blocks :deep(.dashboard-block.sortable-chosen .block-header) {
  cursor: grabbing;
}

.log-section {
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-sm);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: var(--font-size-lg);
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

.section-action:hover {
  background-color: var(--color-primary-light);
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-card {
  padding: 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.log-card:hover {
  background-color: var(--color-surface-hover);
}

.log-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-card-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.log-card-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.log-card-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.log-card-result {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 4px;
  font-style: italic;
}

.note-quick-add {
  margin-bottom: 12px;
}

.note-quick-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--font-size-sm);
  outline: none;
  transition: border-color var(--transition-fast);
}

.note-quick-input:focus {
  border-color: var(--color-primary);
}

.note-quick-input::placeholder {
  color: var(--color-text-tertiary);
}

.note-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-card {
  padding: 10px 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.note-card:hover {
  background-color: var(--color-surface-hover);
}

.note-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.note-card-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.note-delete {
  padding: 2px 6px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  opacity: 0.75;
  white-space: nowrap;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}

.note-card:hover .note-delete {
  opacity: 1;
}

.note-delete:hover {
  color: var(--color-danger);
}

.note-card-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.note-badge {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.note-card-content {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 14px 14px 48px;
  }

  .dashboard-top {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-bottom: 14px;
  }

  .welcome-title {
    font-size: 22px;
  }

  .welcome-text {
    margin-top: 4px;
  }

  .top-right {
    width: 100%;
    order: 2;
  }

  .quick-btn {
    flex: 1;
    justify-content: center;
  }

  .overview-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    gap: 8px;
    margin: 0;
    order: 3;
  }

  .overview-card {
    min-width: 0;
    min-height: 48px;
    padding: 8px;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
  }

  .overview-num {
    font-size: 19px;
  }

  .overview-label {
    font-size: 11px;
  }

  .block-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

@media (min-width: 769px) and (max-width: 1180px) {
  .block-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
