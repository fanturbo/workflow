<template>
  <NModal
    :show="show"
    @update:show="$emit('update:show', $event)"
    :auto-focus="false"
    @after-leave="resetForm"
  >
    <div class="task-modal">
      <!-- 标题输入区 -->
      <div class="modal-header">
        <input
          ref="titleInput"
          v-model="form.title"
          class="title-input"
          placeholder="任务名称..."
          @keydown.enter="!$event.isComposing && handleSubmit()"
          @keydown.escape="$emit('update:show', false)"
        />
      </div>

      <!-- 快捷操作行 -->
      <div class="quick-actions">
        <!-- 优先级选择 -->
        <div class="priority-picker">
          <button
            v-for="p in PRIORITY_LIST"
            :key="p"
            :class="['priority-dot', { active: form.priority === p }]"
            :style="{ '--dot-color': PRIORITY_CONFIGS[p].color }"
            :title="PRIORITY_CONFIGS[p].label"
            @click="form.priority = p"
          >
            <span class="dot" />
            <span class="priority-label">{{ p }}</span>
          </button>
        </div>

        <div class="action-divider" />

        <!-- 日期快捷选择 -->
        <div class="date-chips">
          <button
            :class="['chip', { active: isToday }]"
            @click="setDate(todayLocal())"
          >
            今天
          </button>
          <button
            :class="['chip', { active: isTomorrow }]"
            @click="setDate(tomorrow())"
          >
            明天
          </button>
          <button
            :class="['chip', { active: isWeekend }]"
            @click="setDate(thisWeekend())"
          >
            本周末
          </button>
          <button
            :class="['chip', { active: isNextWeek }]"
            @click="setDate(nextWeek())"
          >
            下周
          </button>
          <NPopover trigger="click" placement="bottom" :width="280" style="padding: 0">
            <template #trigger>
              <button :class="['chip', 'calendar-chip', { active: isCustomDate }]">
                <span>📅</span>
              </button>
            </template>
            <NDatePicker
              v-model:formatted-value="form.scheduledDate"
              type="date"
              value-format="yyyy-MM-dd"
              :panel="true"
              @update:formatted-value="onDateChange"
            />
          </NPopover>
          <button
            v-if="form.scheduledDate"
            class="chip clear-chip"
            title="清除日期"
            @click="clearDate"
          >
            ✕
          </button>
        </div>

        <div class="action-divider" />

        <!-- 重复设置 -->
        <button
          :class="['chip', { active: recurrenceDraft.frequency !== null || panel === 'recurrence' }]"
          @click="togglePanel('recurrence')"
        >
          <span>🔁</span>
          <span>{{ recurrenceDraft.frequency === null ? '重复' : recurrenceSummary }}</span>
        </button>

        <!-- 提醒设置（单次任务） -->
        <button
          v-if="recurrenceDraft.frequency === null"
          :class="['chip', { active: !!form.remindAt || panel === 'reminder' }]"
          @click="togglePanel('reminder')"
        >
          <span>⏰</span>
          <span>{{ form.remindAt ? dayjs(form.remindAt).format('MM-DD HH:mm') : '提醒' }}</span>
        </button>
      </div>

      <!-- 重复配置（内联展开，避免浮层遮挡底部按钮） -->
      <transition name="expand">
        <div v-if="panel === 'recurrence'" class="inline-panel">
          <div class="panel-label">重复频率</div>
          <div class="freq-options">
            <button
              v-for="opt in freqOptions"
              :key="String(opt.value)"
              :class="['chip', { active: recurrenceDraft.frequency === opt.value }]"
              @click="setFrequency(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <template v-if="recurrenceDraft.frequency === 'weekly'">
            <div class="panel-label">每周哪几天</div>
            <div class="weekday-picker">
              <button
                v-for="d in weekdayOrder"
                :key="d"
                :class="['weekday-btn', { active: recurrenceDraft.weekdays.includes(d) }]"
                @click="toggleWeekday(d)"
              >
                {{ weekdayNames[d] }}
              </button>
            </div>
          </template>
          <template v-if="recurrenceDraft.frequency === 'monthly'">
            <div class="panel-label">每月几号</div>
            <NInputNumber
              v-model:value="recurrenceDraft.monthDay"
              :min="1"
              :max="31"
              size="small"
              placeholder="几号"
              style="width: 160px"
            />
            <div class="panel-hint">小月没有该日期时，在当月最后一天执行</div>
          </template>
          <template v-if="recurrenceDraft.frequency === 'custom'">
            <div class="panel-label">每隔几天</div>
            <NInputNumber
              v-model:value="recurrenceDraft.interval"
              :min="1"
              :max="365"
              size="small"
              style="width: 160px"
            />
          </template>
          <template v-if="recurrenceDraft.frequency !== null">
            <div class="panel-row">
              <div class="panel-field">
                <div class="panel-label">结束日期（可选）</div>
                <NDatePicker
                  v-model:formatted-value="recurrenceDraft.endDate"
                  type="date"
                  value-format="yyyy-MM-dd"
                  size="small"
                  clearable
                  placeholder="一直重复"
                  style="width: 100%"
                  :is-date-disabled="isBeforeToday"
                />
              </div>
              <div class="panel-field">
                <div class="panel-label">提醒时间（可选）</div>
                <NTimePicker
                  v-model:formatted-value="recurrenceDraft.remindTime"
                  value-format="HH:mm"
                  format="HH:mm"
                  size="small"
                  clearable
                  placeholder="不提醒"
                  style="width: 100%"
                />
              </div>
            </div>
          </template>
        </div>
      </transition>

      <!-- 提醒配置（内联展开） -->
      <transition name="expand">
        <div v-if="panel === 'reminder'" class="inline-panel">
          <div class="panel-label">快捷选择</div>
          <div class="freq-options">
            <button
              v-for="preset in reminderPresets"
              :key="preset.label"
              class="chip"
              :disabled="preset.disabled"
              @click="applyReminderPreset(preset)"
            >
              {{ preset.label }}
            </button>
          </div>
          <div class="panel-label">自定义时间</div>
          <NDatePicker
            v-model:formatted-value="form.remindAt"
            type="datetime"
            value-format="yyyy-MM-dd'T'HH:mm"
            format="yyyy-MM-dd HH:mm"
            size="small"
            clearable
            placeholder="选择提醒时间"
            style="width: 100%"
          />
          <div class="panel-hint">页面打开时到点提醒；关闭页面请用任务详情里的「导出到日历」</div>
        </div>
      </transition>

      <!-- 展开详情 -->
      <transition name="expand">
        <div v-if="expanded" class="detail-section">
          <div class="detail-grid">
            <div class="detail-field">
              <label class="field-label">描述</label>
              <NInput
                v-model:value="form.description"
                type="textarea"
                :rows="2"
                placeholder="添加任务描述..."
                size="small"
              />
            </div>
            <div class="detail-row">
              <div class="detail-field">
                <label class="field-label">截止日期</label>
                <NDatePicker
                  v-model:formatted-value="form.dueDate"
                  type="date"
                  value-format="yyyy-MM-dd"
                  size="small"
                  clearable
                  placeholder="无"
                  :disabled="recurrenceDraft.frequency !== null"
                  style="width: 100%"
                />
              </div>
              <div class="detail-field">
                <label class="field-label">状态</label>
                <NSelect
                  v-model:value="form.status"
                  :options="statusOptions"
                  size="small"
                  :disabled="recurrenceDraft.frequency !== null"
                />
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-field">
                <label class="field-label">项目</label>
                <NSelect
                  v-model:value="form.projectId"
                  :options="projectOptions"
                  size="small"
                  clearable
                  placeholder="无"
                />
              </div>
              <div class="detail-field">
                <label class="field-label">分类</label>
                <NSelect
                  v-model:value="form.categoryId"
                  :options="categoryOptions"
                  size="small"
                  clearable
                  placeholder="无"
                />
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 底部操作栏 -->
      <div class="modal-footer">
        <div class="footer-left">
          <button class="footer-btn" @click="expanded = !expanded">
            <span class="toggle-icon" :class="{ expanded }">▸</span>
            {{ expanded ? '收起' : '详情' }}
          </button>
        </div>
        <div class="footer-right">
          <button class="footer-btn cancel" @click="$emit('update:show', false)">取消</button>
          <button
            class="footer-btn primary"
            :disabled="!form.title.trim() || submitting"
            @click="handleSubmit"
          >
            {{ submitting ? '创建中...' : '创建任务' }}
          </button>
        </div>
      </div>
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  NModal,
  NInput,
  NInputNumber,
  NSelect,
  NDatePicker,
  NTimePicker,
  NPopover,
  useMessage,
  type SelectOption,
} from 'naive-ui'
import type { RecurrenceFrequency, TaskPriority, TaskStatus } from '@/types'
import { todayLocal, tomorrow, dayjs } from '@/utils/date'
import { PRIORITY_CONFIGS, STATUS_CONFIGS, PRIORITY_LIST, STATUS_LIST } from '@/constants/task'
import { useServices } from '@/services'
import { useTaskStore } from '@/stores/task'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'

const props = defineProps<{ show: boolean; initialDate?: string }>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  created: []
}>()

const message = useMessage()
const services = useServices()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const categoryStore = useCategoryStore()

const titleInput = ref<HTMLInputElement | null>(null)
const expanded = ref(false)
const submitting = ref(false)
const panel = ref<'recurrence' | 'reminder' | null>(null)

function togglePanel(p: 'recurrence' | 'reminder') {
  panel.value = panel.value === p ? null : p
}

const form = ref({
  title: '',
  description: '',
  priority: 'P2' as TaskPriority,
  status: 'todo' as TaskStatus,
  scheduledDate: todayLocal() as string | null,
  dueDate: null as string | null,
  projectId: null as string | null,
  categoryId: null as string | null,
  remindAt: null as string | null,
})

/** 重复规则草稿（frequency 为 null 表示不重复，创建普通任务） */
const recurrenceDraft = ref({
  frequency: null as RecurrenceFrequency | null,
  interval: 1,
  weekdays: [] as number[],
  monthDay: null as number | null,
  endDate: null as string | null,
  remindTime: null as string | null,
})

const freqOptions: { value: RecurrenceFrequency | null; label: string }[] = [
  { value: null, label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'workday', label: '工作日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom', label: '每 N 天' },
]

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
const weekdayOrder = [1, 2, 3, 4, 5, 6, 0]

const recurrenceSummary = computed(() => {
  const r = recurrenceDraft.value
  if (r.frequency === null) return ''
  switch (r.frequency) {
    case 'daily':
      return r.interval > 1 ? `每 ${r.interval} 天` : '每天'
    case 'workday':
      return '工作日'
    case 'weekly': {
      const days = [...r.weekdays].sort().map((d) => weekdayNames[d]).join('、')
      return days ? `每周${days}` : '每周'
    }
    case 'monthly':
      return `每月${r.monthDay ?? '?'}号`
    case 'custom':
      return `每 ${r.interval} 天`
    default:
      return ''
  }
})

function setFrequency(f: RecurrenceFrequency | null) {
  recurrenceDraft.value.frequency = f
  const base = dayjs(form.value.scheduledDate ?? todayLocal())
  if (f === 'weekly' && recurrenceDraft.value.weekdays.length === 0) {
    recurrenceDraft.value.weekdays = [base.day()]
  }
  if (f === 'monthly' && !recurrenceDraft.value.monthDay) {
    recurrenceDraft.value.monthDay = base.date()
  }
}

function toggleWeekday(d: number) {
  const list = recurrenceDraft.value.weekdays
  const idx = list.indexOf(d)
  if (idx >= 0) {
    if (list.length > 1) list.splice(idx, 1)
  } else {
    list.push(d)
  }
}

function isBeforeToday(ts: number): boolean {
  return ts < dayjs().startOf('day').valueOf()
}

const reminderPresets = computed<{ label: string; value: string | null; disabled: boolean }[]>(() => [
  { label: '计划日 09:00', value: `${form.value.scheduledDate ?? todayLocal()}T09:00`, disabled: false },
  { label: '截止日 09:00', value: form.value.dueDate ? `${form.value.dueDate}T09:00` : null, disabled: !form.value.dueDate },
  { label: '今天 18:00', value: `${todayLocal()}T18:00`, disabled: false },
  { label: '明天 09:00', value: `${tomorrow()}T09:00`, disabled: false },
])

function applyReminderPreset(preset: { value: string | null }) {
  if (preset.value) form.value.remindAt = preset.value
}

const statusOptions = computed<SelectOption[]>(() =>
  STATUS_LIST.map((s) => ({ label: STATUS_CONFIGS[s].label, value: s })),
)
const projectOptions = computed<SelectOption[]>(() =>
  projectStore.projects.map((p) => ({ label: p.name, value: p.id })),
)
const categoryOptions = computed<SelectOption[]>(() =>
  categoryStore.categories.map((c) => ({ label: c.name, value: c.id })),
)

const isToday = computed(() => form.value.scheduledDate === todayLocal())
const isTomorrow = computed(() => form.value.scheduledDate === tomorrow())
const isWeekend = computed(() => {
  if (!form.value.scheduledDate) return false
  const d = dayjs(form.value.scheduledDate)
  return d.day() === 6 && d.isAfter(dayjs())
})
const isNextWeek = computed(() => {
  if (!form.value.scheduledDate) return false
  return form.value.scheduledDate === nextWeek()
})
const isCustomDate = computed(() =>
  form.value.scheduledDate !== null &&
  !isToday.value &&
  !isTomorrow.value &&
  !isWeekend.value &&
  !isNextWeek.value,
)

function setDate(date: string) {
  form.value.scheduledDate = date
  form.value.status = 'todo'
}

function clearDate() {
  form.value.scheduledDate = null
  form.value.status = 'todo'
}

function onDateChange(v: string | null) {
  form.value.scheduledDate = v
  form.value.status = 'todo'
}

function thisWeekend(): string {
  const d = dayjs()
  const saturday = d.day(6)
  return saturday.isAfter(d) ? saturday.format('YYYY-MM-DD') : d.add(1, 'week').day(6).format('YYYY-MM-DD')
}

function nextWeek(): string {
  return dayjs().add(1, 'week').format('YYYY-MM-DD')
}

function resetForm() {
  form.value = {
    title: '',
    description: '',
    priority: 'P2',
    status: 'todo',
    scheduledDate: todayLocal(),
    dueDate: null,
    projectId: null,
    categoryId: null,
    remindAt: null,
  }
  recurrenceDraft.value = {
    frequency: null,
    interval: 1,
    weekdays: [],
    monthDay: null,
    endDate: null,
    remindTime: null,
  }
  panel.value = null
  expanded.value = false
}

watch(() => props.show, (val) => {
  if (val) {
    form.value.priority = 'P2'
    form.value.scheduledDate = props.initialDate ?? todayLocal()
    form.value.status = 'todo'
    expanded.value = false
    nextTick(() => titleInput.value?.focus())
  }
})

async function handleSubmit() {
  if (submitting.value) return
  if (!form.value.title.trim()) {
    message.warning('请输入任务名称')
    return
  }
  submitting.value = true
  try {
    const r = recurrenceDraft.value
    if (r.frequency !== null) {
      // 周期任务：创建规则并立即生成今日实例，不再创建普通任务以免重复
      const startDate = form.value.scheduledDate ?? todayLocal()
      await services.recurrence.createRecurrence({
        title: form.value.title.trim(),
        description: form.value.description,
        priority: form.value.priority,
        projectId: form.value.projectId,
        categoryId: form.value.categoryId,
        frequency: r.frequency,
        interval: r.frequency === 'custom' ? Math.max(1, r.interval) : r.interval,
        weekdays: r.frequency === 'weekly'
          ? (r.weekdays.length ? [...r.weekdays] : [dayjs(startDate).day()])
          : [],
        monthDay: r.frequency === 'monthly' ? (r.monthDay ?? dayjs(startDate).date()) : null,
        startDate,
        endDate: r.endDate,
        remindTime: r.remindTime,
      })
      await services.recurrence.generateTodayTasks()
      message.success('周期任务已创建')
    } else {
      await taskStore.createTask({
        title: form.value.title.trim(),
        description: form.value.description,
        priority: form.value.priority,
        status: form.value.status,
        scheduledDate: form.value.scheduledDate,
        dueDate: form.value.dueDate,
        projectId: form.value.projectId,
        categoryId: form.value.categoryId,
        remindAt: form.value.remindAt,
      })
      message.success('任务创建成功')
    }
    emit('update:show', false)
    emit('created')
    resetForm()
  } catch {
    message.error('创建失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.task-modal {
  width: 520px;
  max-width: 92vw;
  background: var(--color-background);
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--color-border-light);
}

/* 标题输入区 */
.modal-header {
  padding: 20px 24px 12px;
}

.title-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
}

.title-input::placeholder {
  color: var(--color-text-tertiary);
  font-weight: 500;
}

/* 快捷操作行 */
.quick-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 24px 16px;
  flex-wrap: wrap;
}

/* 优先级选择 */
.priority-picker {
  display: flex;
  align-items: center;
  gap: 2px;
}

.priority-dot {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background 150ms ease;
}

.priority-dot:hover {
  background: var(--color-surface);
}

.priority-dot.active {
  background: var(--color-surface-hover);
}

.priority-dot .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dot-color);
  flex-shrink: 0;
  transition: transform 150ms ease;
}

.priority-dot.active .dot {
  transform: scale(1.3);
  box-shadow: 0 0 0 2px var(--color-background), 0 0 0 3px var(--dot-color);
}

.priority-dot .priority-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.priority-dot.active .priority-label {
  color: var(--color-text);
}

.action-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
}

/* 日期快捷选择 */
.date-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}

.chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.chip.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: 600;
}

.calendar-chip {
  padding: 4px 8px;
}

.clear-chip {
  border: none;
  color: var(--color-text-tertiary);
  padding: 4px 6px;
}

.clear-chip:hover {
  color: var(--color-danger);
  background: var(--color-danger-light, #FEE2E2);
}

.chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 重复 / 提醒内联面板 */
.inline-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 24px 16px;
  border-top: 1px solid var(--color-border-light);
}

.panel-row {
  display: flex;
  gap: 12px;
}

.panel-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.panel-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.panel-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  line-height: 1.5;
}

.freq-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.weekday-picker {
  display: flex;
  gap: 6px;
}

.weekday-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
}

.weekday-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.weekday-btn.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: 600;
}

/* 展开详情区 */
.detail-section {
  padding: 0 24px 16px;
  border-top: 1px solid var(--color-border-light);
  padding-top: 14px;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  gap: 12px;
}

.detail-row > * {
  flex: 1;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 底部操作栏 */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-top: 1px solid var(--color-border-light);
  background: var(--color-surface);
  border-radius: 0 0 16px 16px;
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-btn {
  padding: 7px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.footer-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.footer-btn.primary {
  background: var(--color-primary);
  color: white;
}

.footer-btn.primary:hover {
  background: var(--color-primary-hover);
  color: white;
}

.footer-btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.footer-btn.cancel:hover {
  color: var(--color-text);
}

.toggle-icon {
  font-size: 10px;
  transition: transform 150ms ease;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 200ms ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}

@media (max-width: 600px) {
  .task-modal {
    width: 92vw;
    border-radius: 12px;
  }

  .detail-row {
    flex-direction: column;
    gap: 12px;
  }

  .quick-actions {
    gap: 6px;
  }

  .action-divider {
    display: none;
  }
}
</style>
