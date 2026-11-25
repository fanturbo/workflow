<template>
  <div class="tasks-view">
    <div class="page-header">
      <h2 class="page-title">全部任务</h2>
      <div class="header-right">
        <button class="add-btn" @click="showTaskModal = true">＋ 新增任务</button>
      </div>
    </div>

    <!-- 视图切换 -->
    <div class="view-toolbar">
      <div class="view-tabs">
        <button :class="['tab-btn', { active: viewMode === 'list' }]" @click="viewMode = 'list'">列表</button>
        <button :class="['tab-btn', { active: viewMode === 'kanban' }]" @click="viewMode = 'kanban'">看板</button>
        <button :class="['tab-btn', { active: viewMode === 'calendar' }]" @click="viewMode = 'calendar'">日历</button>
      </div>

      <!-- 筛选 -->
      <div class="filter-bar">
        <NInput v-model:value="filter.keyword" placeholder="搜索..." size="small" clearable style="width: 180px" />
        <NSelect v-model:value="filter.priority" :options="priorityOptions" size="small" clearable placeholder="优先级" style="width: 120px" />
        <NSelect v-model:value="filter.status" :options="statusOptions" size="small" clearable placeholder="状态" style="width: 120px" />
        <NSelect v-model:value="filter.projectId" :options="projectOptions" size="small" clearable placeholder="项目" style="width: 140px" />
        <NSelect v-model:value="filter.categoryId" :options="categoryOptions" size="small" clearable placeholder="分类" style="width: 140px" />
      </div>
    </div>

    <!-- 日期筛选 + 排序 -->
    <div class="date-toolbar">
      <div class="date-filter">
        <span class="toolbar-label">日期</span>
        <NSelect v-model:value="dateField" :options="dateFieldOptions" size="small" style="width: 108px" />
        <NSelect v-model:value="datePreset" :options="datePresetOptions" size="small" style="width: 128px" />
        <template v-if="datePreset === 'custom'">
          <input v-model="customFrom" class="date-input" type="date" aria-label="开始日期" />
          <span class="range-sep">至</span>
          <input v-model="customTo" class="date-input" type="date" aria-label="结束日期" />
        </template>
      </div>
      <div class="toolbar-right">
        <NSelect v-model:value="sortBy" :options="sortOptions" size="small" style="width: 148px" />
        <span class="result-count">共 {{ filteredTasks.length }} 条</span>
        <button v-if="hasActiveFilter" class="text-btn" @click="clearFilters">清空筛选</button>
        <button class="text-btn" @click="toggleArchived">{{ showArchived ? '收起归档' : '归档任务' }}</button>
      </div>
    </div>

    <div v-if="filter.keyword && matchingLogs.length" class="log-matches">
      <strong>相关工作日志</strong>
      <router-link v-for="log in matchingLogs" :key="log.id" :to="{path: '/work-logs', query: {log: log.id}}">{{ log.title }} · {{ formatDate(log.createdAt) }}</router-link>
    </div>

    <!-- 归档面板 -->
    <div v-if="showArchived" class="archive-panel">
      <div class="archive-head">
        <strong>归档任务</strong>
        <span class="archive-count">{{ archived?.length ?? 0 }} 项</span>
        <button v-if="archived?.length" class="text-btn" @click="restoreAll">全部恢复</button>
      </div>
      <div v-if="archived === null" class="archive-empty">加载中…</div>
      <div v-else-if="!archived.length" class="archive-empty">暂无归档任务</div>
      <div v-else class="archive-list">
        <div v-for="task in archived" :key="task.id" class="archive-item">
          <span class="archive-title">{{ task.title }}</span>
          <span class="archive-date">{{ formatDate(task.archivedAt, 'MM-DD HH:mm') }}</span>
          <button class="text-btn" @click="restore(task.id)">恢复</button>
        </div>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selectedIds.length" class="batch-bar">
      <div class="batch-summary">
        <strong>已选 {{ selectedIds.length }} 项</strong>
        <button class="text-btn" @click="selectAllVisible">全选 {{ filteredTasks.length }} 项</button>
        <button class="text-btn" @click="invertSelection">反选</button>
        <button class="text-btn" @click="selection = []">清空</button>
      </div>
      <div class="batch-actions">
        <div class="batch-group">
          <span class="batch-label">状态</span>
          <NSelect v-model:value="batchStatus" :options="statusOptions" size="small" style="width: 104px" />
          <button class="batch-btn" @click="applyFields({ status: batchStatus }, '状态')">应用</button>
        </div>
        <div class="batch-group">
          <span class="batch-label">计划日期</span>
          <input v-model="batchScheduled" class="date-input" type="date" aria-label="批量计划日期" />
          <button class="batch-btn" @click="applyScheduled">应用</button>
          <button class="batch-btn" @click="applyFields({ scheduledDate: null }, '计划日期')">清除</button>
        </div>
        <div class="batch-group">
          <span class="batch-label">截止日期</span>
          <input v-model="batchDue" class="date-input" type="date" aria-label="批量截止日期" />
          <button class="batch-btn" @click="applyDue">应用</button>
          <button class="batch-btn" @click="applyFields({ dueDate: null }, '截止日期')">清除</button>
        </div>
        <div class="batch-group">
          <span class="batch-label">优先级</span>
          <NSelect v-model:value="batchPriority" :options="priorityOptions" size="small" style="width: 104px" />
          <button class="batch-btn" @click="applyFields({ priority: batchPriority }, '优先级')">应用</button>
        </div>
        <div class="batch-group">
          <span class="batch-label">项目</span>
          <NSelect v-model:value="batchProjectId" :options="projectOptions" size="small" clearable placeholder="选择项目" style="width: 128px" />
          <button class="batch-btn" @click="applyFields({ projectId: batchProjectId || null }, '项目')">应用</button>
        </div>
        <div class="batch-group">
          <span class="batch-label">分类</span>
          <NSelect v-model:value="batchCategoryId" :options="categoryOptions" size="small" clearable placeholder="选择分类" style="width: 128px" />
          <button class="batch-btn" @click="applyFields({ categoryId: batchCategoryId || null }, '分类')">应用</button>
        </div>
        <button class="batch-btn danger" @click="applyArchive">归档所选</button>
      </div>
    </div>
    <!-- 列表视图 -->
    <div v-if="viewMode === 'list'" class="list-view">
      <div v-if="filteredTasks.length" class="list-select-bar">
        <label class="select-all">
          <input type="checkbox" :checked="allVisibleSelected" @change="toggleSelectAll" />
          全选
        </label>
        <span v-if="selectedIds.length" class="selected-hint">已选 {{ selectedIds.length }} / {{ filteredTasks.length }}</span>
      </div>
      <div v-if="filteredTasks.length === 0" class="empty-state">
        <div class="empty-state-icon">☰</div>
        <div class="empty-state-text">{{ hasActiveFilter ? '没有符合筛选条件的任务' : '暂无任务' }}</div>
        <button v-if="hasActiveFilter" class="text-btn" @click="clearFilters">清空筛选</button>
      </div>
      <div v-else class="task-list">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="selectable-task"
          :class="{ selected: selection.includes(task.id) }"
        >
          <input v-model="selection" class="row-check" type="checkbox" :value="task.id" :aria-label="'选择' + task.title" />
          <TaskItem
          :task="task"
          :show-priority="true"
          :show-status="true"
          :show-meta="true"
          @click="handleTaskClick"
          @complete="handleComplete"
          @reopen="handleReopen"
          @move-tomorrow="handleMoveTomorrow"
          @delete="handleDelete"
        />
        </div>
      </div>
    </div>

    <!-- 看板视图 -->
    <div v-else-if="viewMode === 'kanban'" class="kanban-view">
      <div v-for="col in kanbanColumns" :key="col.status" class="kanban-col">
        <div class="kanban-header">
          <span class="kanban-title">{{ col.label }}</span>
          <span class="kanban-count">{{ col.tasks.length }}</span>
        </div>
        <draggable
          :list="col.tasks"
          :group="{ name: 'kanban', pull: true, put: true }"
          item-key="id"
          animation="200"
          ghost-class="kanban-ghost"
          class="kanban-body"
          @add="onKanbanAdd(col.status, $event)"
        >
          <template #item="{ element: task }">
            <div class="kanban-card" @click="handleTaskClick(task)">
              <div class="kanban-card-title">{{ task.title }}</div>
              <div class="kanban-card-tags">
                <PriorityTag :priority="task.priority" />
                <span v-if="task.scheduledDate" class="kanban-date">{{ formatDate(task.scheduledDate, 'MM-DD') }}</span>
              </div>
            </div>
          </template>
          <template #footer>
            <div v-if="col.tasks.length === 0" class="empty-state-text">暂无</div>
          </template>
        </draggable>
      </div>
    </div>

    <!-- 日历视图 -->
    <div v-else class="calendar-view">
      <div class="cal-header">
        <button class="nav-btn" @click="changeMonth(-1)">‹</button>
        <span class="cal-month">{{ calMonthTitle }}</span>
        <button class="nav-btn" @click="changeMonth(1)">›</button>
      </div>
      <div class="cal-weekdays">
        <span v-for="w in weekdays" :key="w">{{ w }}</span>
      </div>
      <div class="cal-grid">
        <div
          v-for="cell in calCells"
          :key="cell.date"
          class="cal-cell"
          :class="{ today: cell.isToday, 'has-tasks': cell.tasks.length > 0, 'other-month': !cell.inMonth }"
        >
          <div class="cal-date">{{ cell.day }}</div>
          <div class="cal-tasks">
            <div
              v-for="task in cell.tasks.slice(0, 3)"
              :key="task.id"
              class="cal-task"
              :style="{ borderLeftColor: priorityColor(task.priority) }"
              @click="handleTaskClick(task)"
            >
              {{ task.title }}
            </div>
            <div v-if="cell.tasks.length > 3" class="cal-more">+{{ cell.tasks.length - 3 }} 更多</div>
          </div>
        </div>
      </div>
    </div>

    <TaskCreateModal v-model:show="showTaskModal" @created="handleCreated" />
    <TaskDetailDrawer v-model:show="detailVisible" :task="selectedTask" @updated="handleUpdated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useServices } from '@/services'
import type { WorkLog } from '@/types'
import { useRoute } from 'vue-router'
import { NInput, NSelect, useDialog, useMessage, type SelectOption } from 'naive-ui'
import draggable from 'vuedraggable'
import { useTaskStore } from '@/stores/task'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'
import { useDashboardStore } from '@/stores/dashboard'
import type { Task, TaskFilter, TaskPriority, TaskStatus } from '@/types'
import { PRIORITY_LIST, STATUS_LIST, PRIORITY_CONFIGS, STATUS_CONFIGS } from '@/constants/task'
import { addDays, dayjs, formatDate, startOfWeek, endOfWeek, todayLocal } from '@/utils/date'
import PriorityTag from '@/components/common/PriorityTag.vue'
import TaskItem from '@/components/common/TaskItem.vue'
import TaskCreateModal from '@/components/common/TaskCreateModal.vue'
import TaskDetailDrawer from '@/components/common/TaskDetailDrawer.vue'

const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const categoryStore = useCategoryStore()
const dashboardStore = useDashboardStore()

const viewMode = ref<'list' | 'kanban' | 'calendar'>('list')
const showTaskModal = ref(false)
const detailVisible = ref(false)
const selectedTask = ref<Task | null>(null)

const filter = ref<TaskFilter>({
  keyword: '',
  priority: null,
  status: null,
  projectId: null,
  categoryId: null,
})

const services = useServices()

// 日期筛选
type DateField = 'scheduled' | 'due'
type DatePreset = 'all' | 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'overdue' | 'unscheduled' | 'custom'
const dateField = ref<DateField>('scheduled')
const datePreset = ref<DatePreset>('all')
const customFrom = ref('')
const customTo = ref('')

const dateFieldOptions: SelectOption[] = [
  { label: '计划日期', value: 'scheduled' },
  { label: '截止日期', value: 'due' },
]
const datePresetOptions: SelectOption[] = [
  { label: '全部日期', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '明天', value: 'tomorrow' },
  { label: '本周', value: 'this_week' },
  { label: '本月', value: 'this_month' },
  { label: '已逾期', value: 'overdue' },
  { label: '未安排', value: 'unscheduled' },
  { label: '自定义范围', value: 'custom' },
]

// 排序
const sortBy = ref<'default' | 'scheduled' | 'due' | 'priority' | 'created'>('default')
const sortOptions: SelectOption[] = [
  { label: '默认排序', value: 'default' },
  { label: '计划日期（近→远）', value: 'scheduled' },
  { label: '截止日期（近→远）', value: 'due' },
  { label: '优先级（高→低）', value: 'priority' },
  { label: '创建时间（新→旧）', value: 'created' },
]

// 批量选择与操作
const selection = ref<string[]>([])
const batchStatus = ref<TaskStatus>('todo')
const batchScheduled = ref('')
const batchDue = ref('')
const batchPriority = ref<TaskPriority>('P2')
const batchProjectId = ref<string | null>(null)
const batchCategoryId = ref<string | null>(null)
const archived = ref<Task[] | null>(null)
const showArchived = ref(false)

const selectedIds = computed(() => filteredTasks.value.filter((t) => selection.value.includes(t.id)).map((t) => t.id))
const allVisibleSelected = computed(
  () => filteredTasks.value.length > 0 && selectedIds.value.length === filteredTasks.value.length,
)
const matchingLogs = ref<WorkLog[]>([])
watch(() => filter.value.keyword, async (keyword, _, onCleanup) => {
  let stale = false
  onCleanup(() => { stale = true })
  const logs = keyword?.trim() ? await services.workLog.search(keyword.trim()) : []
  if (!stale) matchingLogs.value = logs
})

watch(viewMode, (mode) => {
  if (mode !== 'list') selection.value = []
})

function toggleSelectAll(event: Event) {
  selection.value = (event.target as HTMLInputElement).checked
    ? filteredTasks.value.map((t) => t.id)
    : []
}

function selectAllVisible() {
  selection.value = filteredTasks.value.map((t) => t.id)
}

function invertSelection() {
  const current = new Set(selection.value)
  selection.value = filteredTasks.value.filter((t) => !current.has(t.id)).map((t) => t.id)
}

async function loadArchived() {
  archived.value = await services.task.getArchivedTasks()
}

async function toggleArchived() {
  if (showArchived.value) {
    showArchived.value = false
    return
  }
  showArchived.value = true
  archived.value = null
  await loadArchived()
}

async function restore(id: string) {
  await services.task.unarchiveTask(id)
  await Promise.all([handleUpdated(), loadArchived()])
  message.success('任务已恢复')
}

async function restoreAll() {
  const ids = (archived.value ?? []).map((t) => t.id)
  if (!ids.length) return
  await taskStore.batchUnarchive(ids)
  await Promise.all([dashboardStore.loadDashboard(), loadArchived()])
  message.success(`已恢复 ${ids.length} 项任务`)
}

async function applyFields(patch: Partial<Task>, label: string) {
  const ids = selectedIds.value
  if (!ids.length) return
  await taskStore.batchUpdate(ids, patch)
  selection.value = []
  if (showArchived.value) await loadArchived()
  await dashboardStore.loadDashboard()
  message.success(`已更新 ${ids.length} 项任务的${label}`)
}

function applyScheduled() {
  return applyFields({ scheduledDate: batchScheduled.value || null }, '计划日期')
}

function applyDue() {
  return applyFields({ dueDate: batchDue.value || null }, '截止日期')
}

function applyArchive() {
  const ids = selectedIds.value
  if (!ids.length) return
  dialog.warning({
    title: '归档任务',
    content: `确认归档选中的 ${ids.length} 项任务？归档后可在「归档任务」中恢复。`,
    positiveText: '归档',
    negativeText: '取消',
    onPositiveClick: async () => {
      await taskStore.batchArchive(ids)
      selection.value = []
      if (showArchived.value) await loadArchived()
      await dashboardStore.loadDashboard()
      message.success(`已归档 ${ids.length} 项任务`)
    },
  })
}

const hasActiveFilter = computed(
  () =>
    !!filter.value.keyword?.trim() ||
    !!filter.value.priority ||
    !!filter.value.status ||
    !!filter.value.projectId ||
    !!filter.value.categoryId ||
    datePreset.value !== 'all',
)

function clearFilters() {
  filter.value = { keyword: '', priority: null, status: null, projectId: null, categoryId: null }
  datePreset.value = 'all'
  customFrom.value = ''
  customTo.value = ''
  selection.value = []
}

const calMonth = ref(dayjs())

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const priorityOptions = computed<SelectOption[]>(() =>
  PRIORITY_LIST.map((p) => ({ label: PRIORITY_CONFIGS[p].label, value: p })),
)
const statusOptions = computed<SelectOption[]>(() =>
  STATUS_LIST.map((s) => ({ label: STATUS_CONFIGS[s].label, value: s })),
)
const projectOptions = computed<SelectOption[]>(() =>
  projectStore.projects.map((p) => ({ label: p.name, value: p.id })),
)
const categoryOptions = computed<SelectOption[]>(() =>
  categoryStore.categories.map((c) => ({ label: c.name, value: c.id })),
)

/** 任务在本地时区的日期（YYYY-MM-DD），无日期返回空串 */
function taskDate(task: Task): string {
  const raw = dateField.value === 'due' ? task.dueDate : task.scheduledDate
  return formatDate(raw)
}

function compareDate(a: string | null, b: string | null): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

function sortTasks(tasks: Task[]): Task[] {
  const sorted = [...tasks]
  switch (sortBy.value) {
    case 'scheduled':
      return sorted.sort((a, b) => compareDate(a.scheduledDate, b.scheduledDate) || a.sortOrder - b.sortOrder)
    case 'due':
      return sorted.sort((a, b) => compareDate(a.dueDate, b.dueDate) || a.sortOrder - b.sortOrder)
    case 'priority':
      return sorted.sort((a, b) => PRIORITY_CONFIGS[a.priority].weight - PRIORITY_CONFIGS[b.priority].weight || a.sortOrder - b.sortOrder)
    case 'created':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    default:
      return sorted.sort((a, b) => a.sortOrder - b.sortOrder)
  }
}

const filteredTasks = computed(() => {
  let tasks = taskStore.tasks.filter((t) => !t.archivedAt)

  if (filter.value.keyword) {
    const kw = filter.value.keyword.toLowerCase()
    tasks = tasks.filter((t) => t.title.toLowerCase().includes(kw))
  }
  if (filter.value.priority) tasks = tasks.filter((t) => t.priority === filter.value.priority)
  if (filter.value.status) tasks = tasks.filter((t) => t.status === filter.value.status)
  if (filter.value.projectId) tasks = tasks.filter((t) => t.projectId === filter.value.projectId)
  if (filter.value.categoryId) tasks = tasks.filter((t) => t.categoryId === filter.value.categoryId)

  if (datePreset.value !== 'all') {
    const today = todayLocal()
    const weekStart = startOfWeek()
    const weekEnd = endOfWeek()
    const month = dayjs().format('YYYY-MM')
    tasks = tasks.filter((t) => {
      const d = taskDate(t)
      switch (datePreset.value) {
        case 'today':
          return d === today
        case 'tomorrow':
          return d === addDays(today, 1)
        case 'this_week':
          return !!d && d >= weekStart && d <= weekEnd
        case 'this_month':
          return !!d && d.slice(0, 7) === month
        case 'overdue':
          return !!d && d < today && t.status !== 'completed' && t.status !== 'cancelled'
        case 'unscheduled':
          return !d
        case 'custom': {
          if (!customFrom.value && !customTo.value) return true
          if (!d) return false
          if (customFrom.value && d < customFrom.value) return false
          if (customTo.value && d > customTo.value) return false
          return true
        }
        default:
          return true
      }
    })
  }

  return sortTasks(tasks)
})

const kanbanStatuses: TaskStatus[] = ['todo', 'in_progress', 'completed', 'on_hold', 'cancelled']

const kanbanColumns = ref(
  kanbanStatuses.map((status) => ({
    status,
    label: STATUS_CONFIGS[status].label,
    tasks: [] as Task[],
  })),
)

watch(filteredTasks, (tasks) => {
  const visible = new Set(tasks.map((t) => t.id))
  selection.value = selection.value.filter((id) => visible.has(id))
  for (const col of kanbanColumns.value) {
    col.tasks = tasks.filter((t) => t.status === col.status)
  }
}, { immediate: true })

function onKanbanAdd(newStatus: TaskStatus, evt: { newIndex: number }) {
  // vuedraggable already moved the item in the list array
  // find the task at the new index in the target column
  const col = kanbanColumns.value.find((c) => c.status === newStatus)
  if (!col) return
  const task = col.tasks[evt.newIndex]
  if (task && task.status !== newStatus) {
    taskStore.updateTask(task.id, { status: newStatus })
    message.success(`已移至「${STATUS_CONFIGS[newStatus].label}」`)
    dashboardStore.loadDashboard()
  }
}

const calMonthTitle = computed(() => calMonth.value.format('YYYY年MM月'))

const calCells = computed(() => {
  const start = calMonth.value.startOf('month').startOf('week')
  const end = calMonth.value.endOf('month').endOf('week')
  const cells: { date: string; day: number; inMonth: boolean; isToday: boolean; tasks: Task[] }[] = []
  let current = start
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dateStr = current.format('YYYY-MM-DD')
    const tasks = filteredTasks.value.filter((t) => {
      if (!t.scheduledDate) return false
      return formatDate(t.scheduledDate) === dateStr
    })
    cells.push({
      date: dateStr,
      day: current.date(),
      inMonth: current.isSame(calMonth.value, 'month'),
      isToday: dateStr === dayjs().format('YYYY-MM-DD'),
      tasks,
    })
    current = current.add(1, 'day')
  }
  return cells
})

function priorityColor(priority: Task['priority']): string {
  return PRIORITY_CONFIGS[priority].color
}

function changeMonth(offset: number) {
  calMonth.value = calMonth.value.add(offset, 'month')
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
  await taskStore.moveToTomorrow(task.id)
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
}

async function handleUpdated() {
  await taskStore.loadAll()
  await dashboardStore.loadDashboard()
}

watch(() => route.query.keyword, (val) => {
  if (val && typeof val === 'string') {
    filter.value.keyword = val
  }
}, { immediate: true })

onMounted(() => {
  if (route.query.keyword && typeof route.query.keyword === 'string') {
    filter.value.keyword = route.query.keyword
  }
})
</script>

<style scoped>
.log-matches { margin: 12px 0; display: grid; gap: 6px; }

/* 日期筛选与排序 */
.date-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.date-filter,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-label,
.range-sep {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.result-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.date-input {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  font-size: var(--font-size-xs);
}

.text-btn {
  padding: 2px 6px;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.text-btn:hover {
  background: var(--color-primary-light);
}

/* 归档面板 */
.archive-panel {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
}

.archive-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: var(--font-size-sm);
}

.archive-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.archive-empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.archive-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.archive-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.archive-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
}

.archive-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

/* 批量操作栏 */
.batch-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--color-background);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.batch-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  font-size: var(--font-size-sm);
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.batch-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.batch-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.batch-btn {
  padding: 3px 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  white-space: nowrap;
}

.batch-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.batch-btn.danger {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.batch-btn.danger:hover {
  background: var(--color-danger);
  color: white;
}

/* 列表选择 */
.list-select-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.selected-hint {
  color: var(--color-primary);
}

.selectable-task {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
  border-radius: var(--radius-md);
}

.selectable-task.selected {
  background: var(--color-primary-light);
}

.selectable-task > :last-child {
  flex: 1;
  min-width: 0;
}

.row-check {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.tasks-view {
  width: 100%;
  padding: 32px 40px 64px;
  max-width: 1440px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
}

.add-btn {
  padding: 8px 16px;
  background-color: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.add-btn:hover {
  background-color: var(--color-primary-hover);
}

.view-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.view-tabs {
  display: flex;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 3px;
}

.list-view {
  padding: 6px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.tab-btn {
  padding: 5px 16px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.tab-btn.active {
  background-color: var(--color-background);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-sm);
}

.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 看板 */
.kanban-view {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.kanban-col {
  min-width: 220px;
  flex: 1;
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
}

.kanban-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kanban-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.kanban-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background-color: var(--color-surface);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.kanban-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 60px;
}

.kanban-card {
  padding: 10px;
  background-color: var(--color-surface);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border-left: 3px solid var(--color-border);
}

.kanban-card:hover {
  background-color: var(--color-surface-hover);
}

.kanban-ghost {
  opacity: 0.4;
  background-color: var(--color-primary-light) !important;
}

.kanban-card-title {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  margin-bottom: 6px;
}

.kanban-card-tags {
  display: flex;
  gap: 6px;
  align-items: center;
}

.kanban-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 日历 */
.calendar-view {
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 16px;
}

.cal-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.cal-month {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  min-width: 140px;
  text-align: center;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding-bottom: 8px;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.cal-cell {
  min-height: 80px;
  border: 1px solid var(--color-border-light);
  padding: 4px;
}

.cal-cell.today {
  border-color: var(--color-primary);
}

.cal-cell.other-month {
  opacity: 0.4;
}

.cal-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.cal-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cal-task {
  font-size: 11px;
  padding: 2px 4px;
  background-color: var(--color-surface);
  border-left: 3px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cal-task:hover {
  background-color: var(--color-surface-hover);
}

.cal-more {
  font-size: 11px;
  color: var(--color-text-tertiary);
  padding: 2px 4px;
}

.nav-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.nav-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .tasks-view {
    padding: 20px 14px 48px;
  }

  .page-header {
    gap: 12px;
  }

  .view-toolbar {
    align-items: stretch;
  }

  .date-toolbar {
    align-items: stretch;
  }

  .date-filter,
  .toolbar-right {
    width: 100%;
  }

  .date-filter .date-input {
    flex: 1;
    min-width: 120px;
  }

  .batch-group {
    flex: 1 1 240px;
  }

  .view-tabs {
    width: 100%;
  }

  .tab-btn {
    flex: 1;
  }

  .kanban-view {
    flex-direction: column;
  }

  .cal-cell {
    min-height: 60px;
  }

  .filter-bar {
    width: 100%;
  }

  .filter-bar > * {
    flex: 1;
    min-width: 100px;
  }
}
</style>
