<template>
  <div class="settings-view">
    <div class="page-header">
      <h2 class="page-title">设置</h2>
    </div>

    <!-- 工作台区块配置 -->
    <div class="settings-section">
      <h3 class="section-title">工作台区块配置</h3>
      <p class="section-desc">配置工作台显示的区块和顺序</p>
      <div class="block-list">
        <div
          v-for="(block, index) in settingsStore.dashboardBlocks"
          :key="block.type"
          class="block-config-row"
        >
          <div class="block-config-info">
            <span class="block-config-label">{{ blockLabel(block.type) }}</span>
            <span class="block-config-desc">{{ blockDesc(block.type) }}</span>
          </div>
          <div class="block-config-actions">
            <button class="move-btn" :disabled="index === 0" @click="moveUp(index)">↑</button>
            <button class="move-btn" :disabled="index === settingsStore.dashboardBlocks.length - 1" @click="moveDown(index)">↓</button>
            <NSwitch v-model:value="block.visible" @update:value="(v) => toggleVisible(block.type, v)" />
          </div>
        </div>
      </div>
    </div>

    <!-- 主题设置 -->
    <div class="settings-section">
      <h3 class="section-title">外观</h3>
      <div class="setting-row">
        <div>
          <div class="setting-label">主题模式</div>
          <div class="setting-desc">浅色 / 暗色主题，切换后侧边栏与所有页面同步生效</div>
        </div>
        <div class="theme-options">
          <button :class="['theme-btn', { active: theme === 'light' }]" @click="setTheme('light')">
            ☀ 浅色
          </button>
          <button :class="['theme-btn', { active: theme === 'dark' }]" @click="setTheme('dark')">
            ☾ 暗色
          </button>
        </div>
      </div>
    </div>

    <!-- 时区设置 -->
    <div class="settings-section">
      <h3 class="section-title">时区</h3>
      <div class="setting-row">
        <div>
          <div class="setting-label">当前时区</div>
          <div class="setting-desc">所有时间按此时区显示</div>
        </div>
        <div class="timezone-display">{{ timezone }}</div>
      </div>
    </div>

    <!-- 提醒设置 -->
    <div class="settings-section">
      <h3 class="section-title">提醒</h3>
      <p class="section-desc">到点的提醒会常驻显示，直到你手动点「知道了」；刷新页面后未处理的提醒仍在。关闭页面时无法提醒，可在任务详情里「导出到日历」交给系统日历兜底</p>
      <div class="setting-row">
        <div>
          <div class="setting-label">任务提醒</div>
          <div class="setting-desc">到点弹出提醒（页面需保持打开）</div>
        </div>
        <NSwitch :value="reminderEnabled" @update:value="toggleReminderEnabled" />
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">提示音</div>
          <div class="setting-desc">提醒触发时播放提示音</div>
        </div>
        <NSwitch :value="reminderSound" @update:value="toggleReminderSound" />
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">重复提醒</div>
          <div class="setting-desc">未手动关闭前按间隔重复响铃，不会只响一声</div>
        </div>
        <NSwitch :value="reminderRepeat" @update:value="toggleReminderRepeat" />
      </div>
      <div v-if="reminderRepeat" class="setting-row">
        <div>
          <div class="setting-label">提醒间隔</div>
          <div class="setting-desc">两次响铃之间的间隔，浮层始终常驻</div>
        </div>
        <NSelect
          :value="reminderRepeatSec"
          :options="repeatIntervalOptions"
          size="small"
          style="width: 132px"
          @update:value="(v: number) => setRepeatSec(v)"
        />
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">桌面通知</div>
          <div class="setting-desc">{{ notificationStateDesc }}</div>
        </div>
        <button v-if="notificationState === 'default'" class="add-btn" @click="requestNotification">开启桌面通知</button>
        <span v-else class="timezone-display">{{ notificationStateLabel }}</span>
      </div>
    </div>

    <!-- 周期任务管理 -->
    <section class="settings-section">
      <div class="section-header">
        <h3 class="section-title">周期任务</h3>
        <button class="add-btn" @click="openRuleModal(null)">＋ 新增周期任务</button>
      </div>
      <div v-if="rules.length === 0" class="empty-hint">暂无周期任务</div>
      <div v-for="rule in rules" :key="rule.id" class="rule-row">
        <div class="rule-info">
          <span class="rule-name" :class="{ disabled: !rule.enabled }">{{ rule.title }}</span>
          <span class="rule-desc">{{ ruleDescription(rule) }}</span>
        </div>
        <div class="rule-actions">
          <NSwitch :value="rule.enabled" size="small" @update:value="(v) => toggleRule(rule, v)" />
          <button class="edit-btn" @click="openRuleModal(rule)">编辑</button>
          <NPopconfirm @positive-click="deleteRule(rule)">
            <template #trigger>
              <button class="delete-btn">删除</button>
            </template>
            删除规则后已生成的实例保留，后续不再生成
          </NPopconfirm>
        </div>
      </div>
    </section>

    <!-- 周期任务新增/编辑弹窗 -->
    <NModal
      v-model:show="showRuleModal"
      preset="card"
      :title="editingRule ? '编辑周期任务' : '新增周期任务'"
      :style="{ width: '520px', maxWidth: '92vw' }"
      :bordered="false"
    >
      <div class="edit-form">
        <input v-model="ruleForm.title" class="text-input" placeholder="任务名称" />
        <textarea v-model="ruleForm.description" class="text-input" rows="2" placeholder="描述（可选）" />
        <div class="rule-grid">
          <div class="rule-field">
            <label class="field-label">频率</label>
            <NSelect v-model:value="ruleForm.frequency" :options="ruleFreqOptions" size="small" />
          </div>
          <div v-if="ruleForm.frequency !== 'workday'" class="rule-field">
            <label class="field-label">{{ intervalLabel }}</label>
            <NInputNumber v-model:value="ruleForm.interval" :min="1" :max="365" size="small" />
          </div>
        </div>
        <div v-if="ruleForm.frequency === 'weekly'" class="rule-field">
          <label class="field-label">每周哪几天</label>
          <div class="weekday-picker">
            <button
              v-for="d in weekdayOrder"
              :key="d"
              :class="['weekday-btn', { active: ruleForm.weekdays.includes(d) }]"
              @click="toggleRuleWeekday(d)"
            >
              {{ weekdayNames[d] }}
            </button>
          </div>
        </div>
        <div v-if="ruleForm.frequency === 'monthly'" class="rule-field">
          <label class="field-label">每月几号（小月无此日期时在当月最后一天执行）</label>
          <NInputNumber v-model:value="ruleForm.monthDay" :min="1" :max="31" size="small" style="width: 160px" />
        </div>
        <div class="rule-grid">
          <div class="rule-field">
            <label class="field-label">开始日期</label>
            <NDatePicker v-model:formatted-value="ruleForm.startDate" type="date" value-format="yyyy-MM-dd" size="small" />
          </div>
          <div class="rule-field">
            <label class="field-label">结束日期（可选）</label>
            <NDatePicker v-model:formatted-value="ruleForm.endDate" type="date" value-format="yyyy-MM-dd" size="small" clearable placeholder="一直重复" />
          </div>
        </div>
        <div class="rule-grid">
          <div class="rule-field">
            <label class="field-label">提醒时间（可选）</label>
            <NTimePicker v-model:formatted-value="ruleForm.remindTime" value-format="HH:mm" format="HH:mm" size="small" clearable placeholder="不提醒" style="width: 100%" />
          </div>
          <div class="rule-field">
            <label class="field-label">优先级</label>
            <NSelect v-model:value="ruleForm.priority" :options="rulePriorityOptions" size="small" />
          </div>
        </div>
        <div class="rule-grid">
          <div class="rule-field">
            <label class="field-label">项目</label>
            <NSelect v-model:value="ruleForm.projectId" :options="ruleProjectOptions" size="small" clearable placeholder="无" />
          </div>
          <div class="rule-field">
            <label class="field-label">分类</label>
            <NSelect v-model:value="ruleForm.categoryId" :options="ruleCategoryOptions" size="small" clearable placeholder="无" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton @click="showRuleModal = false">取消</NButton>
          <NButton type="primary" :disabled="savingRule" @click="saveRule">{{ savingRule ? '保存中...' : '保存' }}</NButton>
        </div>
      </template>
    </NModal>

    <!-- 项目管理 -->
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">项目管理</h3>
        <button class="add-btn" @click="showProjectModal = true">＋ 新增项目</button>
      </div>
      <div class="project-list">
        <div v-for="project in projectStore.projects" :key="project.id" class="project-row">
          <div class="project-info">
            <span class="project-color" :style="{ backgroundColor: project.color }"></span>
            <span class="project-name">{{ project.name }}</span>
            <span class="project-status">{{ statusLabel(project.status) }}</span>
          </div>
          <div class="project-actions">
            <button class="edit-btn" @click="editProject(project)">编辑</button>
            <button class="delete-btn" @click="deleteProject(project)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分类管理 -->
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">分类管理</h3>
        <button class="add-btn" @click="showCategoryModal = true">＋ 新增分类</button>
      </div>
      <div class="category-list">
        <div v-for="category in categoryStore.categories" :key="category.id" class="category-row">
          <div class="category-info">
            <span class="category-color" :style="{ backgroundColor: category.color }"></span>
            <span class="category-name">{{ category.name }}</span>
          </div>
          <div class="category-actions">
            <button class="delete-btn" @click="deleteCategory(category)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 项目弹窗 -->
    <NModal
      v-model:show="showProjectModal"
      preset="card"
      :title="editingProject ? '编辑项目' : '新增项目'"
      :style="{ width: '420px', maxWidth: '90vw' }"
      :bordered="false"
    >
      <div class="edit-form">
        <input v-model="projectForm.name" class="text-input" placeholder="项目名称" />
        <input v-model="projectForm.description" class="text-input" placeholder="项目描述" />
        <div class="color-picker">
          <label>颜色</label>
          <div class="color-options">
            <button
              v-for="c in colors"
              :key="c"
              class="color-swatch"
              :class="{ active: projectForm.color === c }"
              :style="{ backgroundColor: c }"
              @click="projectForm.color = c"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton @click="showProjectModal = false">取消</NButton>
          <NButton type="primary" @click="saveProject">保存</NButton>
        </div>
      </template>
    </NModal>

    <!-- 分类弹窗 -->
    <NModal
      v-model:show="showCategoryModal"
      preset="card"
      title="新增分类"
      :style="{ width: '380px', maxWidth: '90vw' }"
      :bordered="false"
    >
      <div class="edit-form">
        <input v-model="categoryForm.name" class="text-input" placeholder="分类名称" />
        <div class="color-picker">
          <label>颜色</label>
          <div class="color-options">
            <button
              v-for="c in colors"
              :key="c"
              class="color-swatch"
              :class="{ active: categoryForm.color === c }"
              :style="{ backgroundColor: c }"
              @click="categoryForm.color = c"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton @click="showCategoryModal = false">取消</NButton>
          <NButton type="primary" @click="saveCategory">保存</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NModal, NButton, NSwitch, NSelect, NDatePicker, NTimePicker, NInputNumber, NPopconfirm, useMessage, type SelectOption } from 'naive-ui'
import { useSettingsStore } from '@/stores/settings'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'
import { useLayoutStore } from '@/stores/layout'
import type { Project, Category, DashboardBlockType, TaskPriority } from '@/types'
import { DASHBOARD_BLOCK_CONFIGS, PROJECT_STATUS_CONFIGS, PRIORITY_LIST, PRIORITY_CONFIGS } from '@/constants/task'

import { useServices } from '@/services'
import { dayjs, todayLocal, formatDate, toUtc } from '@/utils/date'
import { useTaskStore } from '@/stores/task'
import { useDashboardStore } from '@/stores/dashboard'
import type { Recurrence, RecurrenceFrequency } from '@/types'

const services = useServices()
const recurrence = services.recurrence
const tasks = useTaskStore()
const dashboard = useDashboardStore()
const rules = ref<Recurrence[]>([])
const savingRule = ref(false)
const showRuleModal = ref(false)
const editingRule = ref<Recurrence | null>(null)

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
const weekdayOrder = [1, 2, 3, 4, 5, 6, 0]

const ruleForm = ref({
  title: '',
  description: '',
  priority: 'P2' as TaskPriority,
  projectId: null as string | null,
  categoryId: null as string | null,
  frequency: 'daily' as RecurrenceFrequency,
  interval: 1,
  weekdays: [] as number[],
  monthDay: null as number | null,
  startDate: todayLocal(),
  endDate: null as string | null,
  remindTime: null as string | null,
})

const ruleFreqOptions: SelectOption[] = [
  { label: '每天', value: 'daily' },
  { label: '工作日（周一至周五）', value: 'workday' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: '自定义间隔（每 N 天）', value: 'custom' },
]

const rulePriorityOptions: SelectOption[] = PRIORITY_LIST.map((p) => ({ label: PRIORITY_CONFIGS[p].label, value: p }))
const ruleProjectOptions = computed<SelectOption[]>(() => projectStore.projects.map((p) => ({ label: p.name, value: p.id })))
const ruleCategoryOptions = computed<SelectOption[]>(() => categoryStore.categories.map((c) => ({ label: c.name, value: c.id })))

const intervalLabel = computed(() => {
  switch (ruleForm.value.frequency) {
    case 'weekly': return '每隔几周'
    case 'monthly': return '每隔几月'
    default: return '每隔几天'
  }
})

function ruleDescription(rule: Recurrence) {
  let text = ''
  switch (rule.frequency) {
    case 'daily': text = rule.interval > 1 ? `每 ${rule.interval} 天` : '每天'; break
    case 'workday': text = '工作日'; break
    case 'weekly': {
      const days = [...rule.weekdays].sort().map((d) => weekdayNames[d]).join('、')
      text = (rule.interval > 1 ? `每 ${rule.interval} 周` : '每周') + (days ? ` ${days}` : '')
      break
    }
    case 'monthly':
      text = `${rule.interval > 1 ? `每 ${rule.interval} 月` : '每月'} ${rule.monthDay} 日`
      break
    case 'custom': text = `每 ${rule.interval} 天`; break
  }
  if (rule.remindTime) text += ` · ${rule.remindTime} 提醒`
  if (rule.endDate) text += ` · 至 ${formatDate(rule.endDate)}`
  return text
}

function toggleRuleWeekday(d: number) {
  const list = ruleForm.value.weekdays
  const idx = list.indexOf(d)
  if (idx >= 0) {
    if (list.length > 1) list.splice(idx, 1)
  } else {
    list.push(d)
  }
}

function openRuleModal(rule: Recurrence | null) {
  editingRule.value = rule
  if (rule) {
    ruleForm.value = {
      title: rule.title,
      description: rule.description,
      priority: rule.priority,
      projectId: rule.projectId,
      categoryId: rule.categoryId,
      frequency: rule.frequency,
      interval: rule.interval,
      weekdays: [...rule.weekdays],
      monthDay: rule.monthDay,
      startDate: formatDate(rule.startDate),
      endDate: rule.endDate ? formatDate(rule.endDate) : null,
      remindTime: rule.remindTime ?? null,
    }
  } else {
    ruleForm.value = {
      title: '',
      description: '',
      priority: 'P2',
      projectId: null,
      categoryId: null,
      frequency: 'daily',
      interval: 1,
      weekdays: [],
      monthDay: null,
      startDate: todayLocal(),
      endDate: null,
      remindTime: null,
    }
  }
  showRuleModal.value = true
}

async function refreshRules() {
  await recurrence.generateTodayTasks()
  rules.value = await recurrence.getAllRecurrences()
  await Promise.all([tasks.loadAll(), dashboard.loadDashboard()])
}

async function saveRule() {
  if (savingRule.value) return
  if (!ruleForm.value.title.trim()) {
    message.warning('请输入任务名称')
    return
  }
  savingRule.value = true
  try {
    const f = ruleForm.value
    const start = dayjs(f.startDate)
    const payload = {
      title: f.title.trim(),
      description: f.description,
      priority: f.priority,
      projectId: f.projectId,
      categoryId: f.categoryId,
      frequency: f.frequency,
      interval: Math.max(1, f.interval),
      weekdays: f.frequency === 'weekly' ? (f.weekdays.length ? [...f.weekdays] : [start.day()]) : [],
      monthDay: f.frequency === 'monthly' ? (f.monthDay ?? start.date()) : null,
      startDate: f.startDate,
      endDate: f.endDate,
      remindTime: f.remindTime,
    }
    if (editingRule.value) {
      await recurrence.updateRecurrence(editingRule.value.id, {
        ...payload,
        startDate: toUtc(payload.startDate) ?? undefined,
        endDate: payload.endDate ? toUtc(payload.endDate) : null,
      })
      message.success('周期任务已更新')
    } else {
      await recurrence.createRecurrence(payload)
      message.success('周期任务已添加')
    }
    showRuleModal.value = false
    editingRule.value = null
    await refreshRules()
  } catch (error) {
    console.error('周期任务保存失败', error)
    message.error('周期任务保存失败')
  } finally {
    savingRule.value = false
  }
}

async function toggleRule(rule: Recurrence, enabled: boolean) {
  await recurrence.toggleEnabled(rule.id, enabled)
  await refreshRules()
}

async function deleteRule(rule: Recurrence) {
  await recurrence.deleteRecurrence(rule.id)
  await refreshRules()
  message.success('周期规则已删除')
}

onMounted(async () => { rules.value = await recurrence.getAllRecurrences() })

// ===== 提醒设置 =====
const reminderEnabled = computed(() => settingsStore.settings?.reminderEnabled ?? true)
const reminderSound = computed(() => settingsStore.settings?.reminderSound ?? true)
const reminderRepeat = computed(() => settingsStore.settings?.reminderRepeat ?? true)
const reminderRepeatSec = computed(() => settingsStore.settings?.reminderRepeatSec ?? 60)
const repeatIntervalOptions = [
  { label: '30 秒', value: 30 },
  { label: '1 分钟', value: 60 },
  { label: '5 分钟', value: 300 },
]
const notificationState = ref(services.reminder.getPermissionState())

const notificationStateLabel = computed(() => ({
  granted: '已开启',
  denied: '已被浏览器拒绝',
  unsupported: '当前环境不支持（需 HTTPS）',
  default: '未开启',
}[notificationState.value]))

const notificationStateDesc = computed(() => ({
  granted: '到点时弹出系统级通知，后台标签页也能收到',
  denied: '权限被拒，可在浏览器地址栏的站点设置中重新允许',
  unsupported: '桌面通知仅在 HTTPS 或 localhost 环境可用',
  default: '授权后到点可弹出系统级通知',
}[notificationState.value]))

async function toggleReminderEnabled(v: boolean) {
  await services.settings.updateSettings({ reminderEnabled: v })
  await settingsStore.loadSettings()
  message.success(v ? '提醒已开启' : '提醒已关闭')
}

async function toggleReminderSound(v: boolean) {
  await services.settings.updateSettings({ reminderSound: v })
  await settingsStore.loadSettings()
}

async function toggleReminderRepeat(v: boolean) {
  await services.settings.updateSettings({ reminderRepeat: v })
  await settingsStore.loadSettings()
}

async function setRepeatSec(v: number) {
  await services.settings.updateSettings({ reminderRepeatSec: v })
  await settingsStore.loadSettings()
}

async function requestNotification() {
  const ok = await services.reminder.ensurePermission()
  notificationState.value = services.reminder.getPermissionState()
  if (ok) {
    message.success('桌面通知已开启')
  } else {
    message.warning('浏览器拒绝了通知权限，可在浏览器地址栏的站点设置中重新允许')
  }
}

const message = useMessage()
const settingsStore = useSettingsStore()
const layoutStore = useLayoutStore()
const projectStore = useProjectStore()
const categoryStore = useCategoryStore()

const theme = computed(() => (layoutStore.isDark ? 'dark' : 'light'))
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai')

const showProjectModal = ref(false)
const showCategoryModal = ref(false)
const editingProject = ref<Project | null>(null)

const colors = ['#4F6EF7', '#16A34A', '#D97706', '#DC2626', '#8B5CF6', '#0891B2', '#64748B', '#EC4899']

const projectForm = ref({ name: '', description: '', color: '#4F6EF7' })
const categoryForm = ref({ name: '', color: '#64748B' })

function blockLabel(type: DashboardBlockType) { return DASHBOARD_BLOCK_CONFIGS[type].label }
function blockDesc(type: DashboardBlockType) { return DASHBOARD_BLOCK_CONFIGS[type].description }
function statusLabel(status: Project['status']) { return PROJECT_STATUS_CONFIGS[status].label }

async function toggleVisible(type: DashboardBlockType, visible: boolean) {
  await settingsStore.toggleBlockVisible(type, visible)
  message.success(visible ? '已显示' : '已隐藏')
}

async function moveUp(index: number) {
  const blocks = [...settingsStore.dashboardBlocks]
  const types = blocks.sort((a, b) => a.order - b.order).map((b) => b.type)
  if (index > 0) {
    ;[types[index - 1], types[index]] = [types[index], types[index - 1]]
    await settingsStore.updateBlockOrder(types)
  }
}

async function moveDown(index: number) {
  const blocks = [...settingsStore.dashboardBlocks]
  const types = blocks.sort((a, b) => a.order - b.order).map((b) => b.type)
  if (index < types.length - 1) {
    ;[types[index], types[index + 1]] = [types[index + 1], types[index]]
    await settingsStore.updateBlockOrder(types)
  }
}

async function setTheme(t: string) {
  const dark = t === 'dark'
  layoutStore.applyTheme(dark)
  await settingsStore.updateTheme(dark ? 'dark' : 'light')
}

function editProject(project: Project) {
  editingProject.value = project
  projectForm.value = { name: project.name, description: project.description, color: project.color }
  showProjectModal.value = true
}

async function saveProject() {
  if (!projectForm.value.name.trim()) {
    message.warning('请输入项目名称')
    return
  }
  if (editingProject.value) {
    await projectStore.updateProject(editingProject.value.id, {
      name: projectForm.value.name,
      description: projectForm.value.description,
      color: projectForm.value.color,
    })
    message.success('项目已更新')
  } else {
    await projectStore.createProject({
      name: projectForm.value.name,
      description: projectForm.value.description,
      color: projectForm.value.color,
    })
    message.success('项目已创建')
  }
  showProjectModal.value = false
  editingProject.value = null
  projectForm.value = { name: '', description: '', color: '#4F6EF7' }
}

async function deleteProject(project: Project) {
  if (!confirm(`确定删除项目「${project.name}」？关联任务的项目将置空。`)) return
  await projectStore.deleteProject(project.id)
  message.success('项目已删除')
}

async function saveCategory() {
  if (!categoryForm.value.name.trim()) {
    message.warning('请输入分类名称')
    return
  }
  await categoryStore.createCategory({
    name: categoryForm.value.name,
    color: categoryForm.value.color,
  })
  message.success('分类已创建')
  showCategoryModal.value = false
  categoryForm.value = { name: '', color: '#64748B' }
}

async function deleteCategory(category: Category) {
  if (!confirm(`确定删除分类「${category.name}」？关联任务的分类将置空。`)) return
  await categoryStore.deleteCategory(category.id)
  message.success('分类已删除')
}
</script>

<style scoped>
.rule-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.rule-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rule-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.rule-name.disabled {
  color: var(--color-text-tertiary);
  text-decoration: line-through;
}

.rule-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  padding: 8px 0;
}

.rule-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.rule-field {
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

.weekday-picker {
  display: flex;
  gap: 6px;
}

.weekday-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
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
  background-color: var(--color-primary-light);
  font-weight: 600;
}

textarea.text-input {
  resize: vertical;
  font-family: inherit;
}

@media (max-width: 600px) {
  .rule-grid {
    grid-template-columns: 1fr;
  }
}

.settings-view {
  width: 100%;
  padding: 32px 40px 64px;
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
}

.settings-section {
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
  margin-bottom: 16px;
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.section-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 4px;
  margin-bottom: 16px;
}

.block-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.block-config-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.block-config-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.block-config-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.block-config-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.block-config-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.move-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.move-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.setting-label {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
}

.setting-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.theme-options {
  display: flex;
  gap: 4px;
}

.theme-btn {
  padding: 6px 16px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.theme-btn.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.theme-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.timezone-display {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background-color: var(--color-surface);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
}

.add-btn {
  padding: 6px 14px;
  background-color: var(--color-primary);
  border: none;
  border-radius: var(--radius-sm);
  color: white;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.project-list, .category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-row, .category-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.project-info, .category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-color, .category-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.project-name, .category-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.project-status {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding: 2px 8px;
  background-color: var(--color-background);
  border-radius: var(--radius-sm);
}

.project-actions, .category-actions {
  display: flex;
  gap: 4px;
}

.edit-btn, .delete-btn {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  background-color: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.delete-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.text-input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  outline: none;
}

.text-input:focus {
  border-color: var(--color-primary);
}

.color-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-picker label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.color-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.color-swatch.active {
  border-color: var(--color-text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .settings-view {
    padding: 20px 14px 48px;
  }
}
</style>
