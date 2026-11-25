<template>
  <NDrawer
    :show="show"
    @update:show="$emit('update:show', $event)"
    :width="480"
    style="max-width: 100vw"
    placement="right"
    :auto-focus="false"
  >
    <NDrawerContent :title="task ? '任务详情' : ''" closable>
      <template v-if="task">
        <div class="detail-content">
          <!-- 标题 -->
          <div class="detail-section">
            <NInput
              v-model:value="editTitle"
              :bordered="false"
              class="detail-title-input"
              placeholder="任务名称"
              @blur="saveTitle"
            />
          </div>

          <!-- 状态和优先级 -->
          <div class="detail-tags">
            <StatusTag :status="task.status" />
            <PriorityTag :priority="task.priority" />
            <span v-if="task.scheduledDate" class="detail-date">
              计划: {{ formatDate(task.scheduledDate) }}
            </span>
            <span v-if="task.dueDate" class="detail-date" :class="{ overdue: isDueOverdue }">
              截止: {{ formatDate(task.dueDate) }}
            </span>
          </div>

          <!-- 描述 -->
          <div class="detail-section">
            <label class="section-label">描述</label>
            <NInput
              v-model:value="editDescription"
              type="textarea"
              :rows="3"
              placeholder="添加任务描述..."
              @blur="saveDescription"
            />
          </div>

          <!-- 属性编辑 -->
          <div class="detail-section detail-grid">
            <div class="detail-field">
              <label class="section-label">优先级</label>
              <NSelect
                v-model:value="editPriority"
                :options="priorityOptions"
                size="small"
                @update:value="(v) => updateField('priority', v)"
              />
            </div>
            <div class="detail-field">
              <label class="section-label">状态</label>
              <NSelect
                v-model:value="editStatus"
                :options="statusOptions"
                size="small"
                @update:value="(v) => updateField('status', v)"
              />
            </div>
            <div class="detail-field">
              <label class="section-label">计划日期</label>
              <NDatePicker
                v-model:formatted-value="editScheduledDate"
                type="date"
                value-format="yyyy-MM-dd"
                size="small"
                clearable
                @update:formatted-value="(v) => updateField('scheduledDate', v)"
              />
            </div>
            <div class="detail-field">
              <label class="section-label">截止日期</label>
              <NDatePicker
                v-model:formatted-value="editDueDate"
                type="date"
                value-format="yyyy-MM-dd"
                size="small"
                clearable
                @update:formatted-value="(v) => updateField('dueDate', v)"
              />
            </div>
            <div class="detail-field">
              <label class="section-label">提醒时间</label>
              <NDatePicker
                v-model:formatted-value="editRemindAt"
                type="datetime"
                value-format="yyyy-MM-dd'T'HH:mm"
                format="yyyy-MM-dd HH:mm"
                size="small"
                clearable
                placeholder="不提醒"
                @update:formatted-value="(v) => updateField('remindAt', v)"
              />
            </div>
            <div class="detail-field">
              <label class="section-label">项目</label>
              <NSelect
                v-model:value="editProjectId"
                :options="projectOptions"
                size="small"
                clearable
                @update:value="(v) => updateField('projectId', v)"
              />
            </div>
            <div class="detail-field">
              <label class="section-label">分类</label>
              <NSelect
                v-model:value="editCategoryId"
                :options="categoryOptions"
                size="small"
                clearable
                @update:value="(v) => updateField('categoryId', v)"
              />
            </div>
          </div>

          <!-- 时间信息 -->
          <div class="detail-section">
            <div class="info-row">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatDateTime(task.createdAt) }}</span>
            </div>
            <div v-if="task.completedAt" class="info-row">
              <span class="info-label">完成时间</span>
              <span class="info-value">{{ formatDateTime(task.completedAt) }}</span>
            </div>
            <div v-if="task.source" class="info-row">
              <span class="info-label">来源</span>
              <span class="info-value">{{ sourceLabel }}</span>
            </div>
            <div v-if="task.recurrenceId && task.occurrenceDate" class="info-row">
              <span class="info-label">周期实例</span>
              <span class="info-value">{{ task.occurrenceDate }} 生成 · 规则可在「设置 - 周期任务」管理</span>
            </div>
            <div v-if="task.remindAt" class="info-row">
              <span class="info-label">提醒</span>
              <span class="info-value">
                {{ formatDateTime(task.remindAt) }}
                <template v-if="task.reminderAckedAt">（已处理）</template>
                <template v-else-if="task.remindedAt">（待处理 · 浮层常驻）</template>
              </span>
            </div>
          </div>

          <!-- 关联工作日志 -->
          <div class="detail-section">
            <label class="section-label">工作日志 ({{ relatedLogs.length }})</label>
            <div v-if="relatedLogs.length === 0" class="empty-hint">暂无关联日志</div>
            <div v-else class="log-list">
              <div v-for="log in relatedLogs" :key="log.id" class="log-item">
                <span class="log-title">{{ log.title }}</span>
                <span class="log-date">{{ formatDate(log.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 修改历史 -->
          <div class="detail-section">
            <label class="section-label">修改历史 ({{ history.length }})</label>
            <div v-if="history.length === 0" class="empty-hint">暂无修改历史</div>
            <div v-else class="history-list">
              <div v-for="h in history" :key="h.id" class="history-item">
                <span class="history-action">{{ h.action }}</span>
                <span v-if="h.field" class="history-field">{{ h.field }}</span>
                <span class="history-time">{{ fromNow(h.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="drawer-footer">
          <div class="footer-left">
            <NButton
              v-if="task && task.status !== 'completed'"
              type="primary"
              size="small"
              @click="handleComplete"
            >
              完成
            </NButton>
            <NButton
              v-if="task && task.status === 'completed'"
              size="small"
              @click="handleReopen"
            >
              重新打开
            </NButton>
            <NButton
              v-if="task && (task.remindAt || task.dueDate || task.scheduledDate)"
              size="small"
              title="导出 .ics 文件，交给系统日历，关闭页面也能提醒"
              @click="handleExportIcs"
            >
              导出到日历
            </NButton>
          </div>
          <div class="footer-right">
            <NPopconfirm @positive-click="handleDelete">
              <template #trigger>
                <NButton size="small" type="error" ghost>删除</NButton>
              </template>
              确定删除此任务？
            </NPopconfirm>
          </div>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NInput,
  NSelect,
  NDatePicker,
  NButton,
  NPopconfirm,
  useMessage,
  type SelectOption,
} from 'naive-ui'
import type { Task, WorkLog, TaskHistory } from '@/types'
import PriorityTag from './PriorityTag.vue'
import StatusTag from './StatusTag.vue'
import { PRIORITY_LIST, STATUS_LIST, PRIORITY_CONFIGS, STATUS_CONFIGS, SOURCE_CONFIGS } from '@/constants/task'
import { useServices } from '@/services'
import { useTaskStore } from '@/stores/task'
import { useWorkLogStore } from '@/stores/worklog'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'
import { formatDate, formatDateTime, fromNow, isPast } from '@/utils/date'

const props = defineProps<{ show: boolean; task: Task | null }>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  updated: []
}>()

const message = useMessage()
const services = useServices()
const taskStore = useTaskStore()
const workLogStore = useWorkLogStore()
const projectStore = useProjectStore()
const categoryStore = useCategoryStore()

const editTitle = ref('')
const editDescription = ref('')
const editScheduledDate = ref<string | null>(null)
const editDueDate = ref<string | null>(null)
const editRemindAt = ref<string | null>(null)
const editPriority = ref<Task['priority']>('P2')
const editStatus = ref<Task['status']>('todo')
const editProjectId = ref<string | null>(null)
const editCategoryId = ref<string | null>(null)
const relatedLogs = ref<WorkLog[]>([])
const history = ref<TaskHistory[]>([])

const isDueOverdue = computed(() => editDueDate.value ? isPast(editDueDate.value) : false)
const sourceLabel = computed(() => props.task ? SOURCE_CONFIGS[props.task.source].label : '')

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

watch(() => props.task, async (task) => {
  if (task) {
    editTitle.value = task.title
    editDescription.value = task.description
    editScheduledDate.value = task.scheduledDate ? formatDate(task.scheduledDate) : null
    editDueDate.value = task.dueDate ? formatDate(task.dueDate) : null
    editRemindAt.value = task.remindAt ? formatDateTime(task.remindAt, 'YYYY-MM-DDTHH:mm') : null
    editPriority.value = task.priority
    editStatus.value = task.status
    editProjectId.value = task.projectId
    editCategoryId.value = task.categoryId
    relatedLogs.value = await workLogStore.getLogsByTask(task.id)
    history.value = await taskStore.getTaskHistory(task.id)
  }
}, { immediate: true })

async function saveTitle() {
  if (!props.task || editTitle.value === props.task.title) return
  await taskStore.updateTask(props.task.id, { title: editTitle.value })
  emit('updated')
}

async function saveDescription() {
  if (!props.task || editDescription.value === props.task.description) return
  await taskStore.updateTask(props.task.id, { description: editDescription.value })
}

async function updateField(field: string, value: unknown) {
  if (!props.task) return
  await taskStore.updateTask(props.task.id, { [field]: value } as Partial<Task>)
  emit('updated')
}

async function handleComplete() {
  if (!props.task) return
  await taskStore.completeTask(props.task.id)
  message.success('任务已完成')
  emit('updated')
}

async function handleReopen() {
  if (!props.task) return
  await taskStore.reopenTask(props.task.id)
  message.success('任务已重新打开')
  emit('updated')
}

function handleExportIcs() {
  if (!props.task) return
  services.reminder.downloadIcs(props.task)
  message.success('已导出 .ics 日历文件，导入系统日历后关闭页面也能提醒')
}

async function handleDelete() {
  if (!props.task) return
  await taskStore.deleteTask(props.task.id)
  message.success('任务已删除')
  emit('update:show', false)
  emit('updated')
}
</script>

<style scoped>
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-title-input {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  padding: 0;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.detail-date {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: 2px 8px;
  background-color: var(--color-surface);
  border-radius: var(--radius-sm);
}

.detail-date.overdue {
  color: var(--color-danger);
  background-color: var(--color-danger-light);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: var(--font-size-sm);
}

.info-label {
  color: var(--color-text-secondary);
}

.info-value {
  color: var(--color-text);
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  padding: 8px 0;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-sm);
}

.log-title {
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.log-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: var(--font-size-xs);
}

.history-action {
  color: var(--color-text);
}

.history-field {
  color: var(--color-text-secondary);
}

.history-time {
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.drawer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

@media (max-width: 480px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
