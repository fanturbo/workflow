<template>
  <div class="worklog-view">
    <div class="page-header">
      <div>
        <h2 class="page-title">工作日志</h2>
        <p class="page-subtitle">工作记录计入复盘；随记只用来记一句话或想法</p>
      </div>
      <button class="add-btn" @click="handleAdd">
        {{ activeTab === 'logs' ? '＋ 新增记录' : '＋ 新增随记' }}
      </button>
    </div>

    <!-- Tab -->
    <div class="view-tabs">
      <button class="view-tab" :class="{ active: activeTab === 'logs' }" @click="activeTab = 'logs'">
        工作记录 <span class="tab-count">{{ workLogStore.logCount }}</span>
      </button>
      <button class="view-tab" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">
        随记 <span class="tab-count">{{ noteStore.noteCount }}</span>
      </button>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <label>记录日期 <input type="date" v-model="dayFilter" /></label>
      <NInput v-model:value="searchKeyword" :placeholder="activeTab === 'logs' ? '搜索日志...' : '搜索随记...'" clearable @update:value="handleSearch" />
      <NSelect v-model:value="filterProject" :options="projectOptions" clearable placeholder="项目" @update:value="handleFilter" />
      <NSelect v-model:value="filterCategory" :options="categoryOptions" clearable placeholder="分类" @update:value="handleFilter" />
    </div>

    <!-- 工作记录 -->
    <div v-if="activeTab === 'logs'" class="timeline-view">
      <div v-if="displayLogs.length === 0" class="empty-state">
        <div class="empty-state-icon">✎</div>
        <div class="empty-state-text">暂无工作日志</div>
      </div>
      <div v-else class="timeline">
        <div v-for="log in displayLogs" :key="log.id" class="timeline-item" @click="handleEdit(log)">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">{{ log.title }}</span>
              <span class="timeline-date">{{ formatDate(log.createdAt, 'MM-DD HH:mm') }}</span>
            </div>
            <div v-if="log.content" class="timeline-body">{{ log.content }}</div>
            <div v-if="log.result" class="timeline-result">成果：{{ log.result }}</div>
            <div class="timeline-meta">
              <span v-if="log.projectId" class="meta-tag" :style="{ color: projectColor(log.projectId) }">{{ projectName(log.projectId) }}</span>
              <span v-if="log.categoryId" class="meta-tag" :style="{ color: categoryColor(log.categoryId) }">{{ categoryName(log.categoryId) }}</span>
              <span class="meta-type">{{ detailTypeLabel(log.detailType) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 随记 -->
    <div v-else class="notes-view">
      <div class="quick-add">
        <input
          v-model="quickNote"
          class="quick-input"
          placeholder="记一句话、一个想法，按 Enter 保存..."
          @keydown.enter="handleQuickNoteAdd"
        />
      </div>

      <div v-if="groupedNotes.length === 0" class="empty-state">
        <div class="empty-state-icon">✎</div>
        <div class="empty-state-text">暂无随记</div>
        <div class="empty-state-hint">随时记下一句话或一个想法，不计入工作统计</div>
      </div>

      <div v-else class="note-groups">
        <section v-for="group in groupedNotes" :key="group.date" class="note-group">
          <h4 class="note-group-date">{{ group.label }}</h4>
          <div v-for="note in group.items" :key="note.id" class="note-card" @click="openNoteEdit(note)">
            <div class="note-card-header">
              <span class="note-time">{{ formatDate(note.createdAt, 'HH:mm') }}</span>
              <span v-if="noteBadge(note)" class="note-badge">{{ noteBadge(note) }}</span>
            </div>
            <div class="note-content">{{ note.content }}</div>
            <div class="note-footer">
              <div class="note-meta">
                <span v-if="note.projectId" class="meta-tag" :style="{ color: projectColor(note.projectId) }">{{ projectName(note.projectId) }}</span>
                <span v-if="note.categoryId" class="meta-tag" :style="{ color: categoryColor(note.categoryId) }">{{ categoryName(note.categoryId) }}</span>
              </div>
              <div class="note-actions" @click.stop>
                <button v-if="!note.convertedTaskId" class="note-action" @click="handleConvertTask(note)">转任务</button>
                <button v-if="!note.convertedWorkLogId" class="note-action" @click="handleConvertWorkLog(note)">补全为记录</button>
                <NPopconfirm @positive-click="() => handleDeleteNote(note)">
                  <template #trigger>
                    <button class="note-action danger">删除</button>
                  </template>
                  确定删除这条随记吗？删除后不可恢复。
                </NPopconfirm>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- 编辑工作日志 -->
    <NModal
      v-model:show="editVisible"
      preset="card"
      title="编辑工作日志"
      :style="{ width: '640px', maxWidth: '90vw' }"
      :bordered="false"
    >
      <div v-if="editLog" class="edit-form">
        <NInput v-model:value="editLog.title" placeholder="标题" />
        <NInput v-model:value="editLog.content" type="textarea" :rows="3" placeholder="工作内容" />
        <NInput v-model:value="editLog.result" type="textarea" :rows="2" placeholder="工作成果" />
        <div class="form-row">
          <NSelect v-model:value="editLog.projectId" :options="projectOptions" clearable placeholder="项目" />
          <NSelect v-model:value="editLog.categoryId" :options="categoryOptions" clearable placeholder="分类" />
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton type="error" ghost @click="handleDelete">删除</NButton>
          <div class="footer-right">
            <NButton @click="editVisible = false">取消</NButton>
            <NButton type="primary" @click="handleSave">保存</NButton>
          </div>
        </div>
      </template>
    </NModal>

    <!-- 编辑随记 -->
    <NoteCaptureModal v-model:show="noteEditVisible" :note="editingNote" @updated="handleNoteUpdated" @deleted="handleNoteUpdated" />

    <!-- 新增 / 补全工作记录 -->
    <WorkLogCreateModal
      v-model:show="showLogModal"
      :initial-title="workLogPrefill.title"
      :initial-content="workLogPrefill.content"
      :initial-project-id="workLogPrefill.projectId"
      :initial-category-id="workLogPrefill.categoryId"
      @created="handleWorkLogCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref, computed, onMounted, watch } from 'vue'
import { NModal, NInput, NSelect, NButton, NPopconfirm, useMessage, type SelectOption } from 'naive-ui'
import { useWorkLogStore } from '@/stores/worklog'
import { useNoteStore } from '@/stores/note'
import { useTaskStore } from '@/stores/task'
import { useDashboardStore } from '@/stores/dashboard'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'
import type { Note, WorkLog } from '@/types'
import { DETAIL_TYPE_CONFIGS } from '@/constants/task'
import { dayjs, formatDate, todayLocal } from '@/utils/date'
import WorkLogCreateModal from '@/components/common/WorkLogCreateModal.vue'
import NoteCaptureModal from '@/components/common/NoteCaptureModal.vue'

const message = useMessage()
const workLogStore = useWorkLogStore()
const noteStore = useNoteStore()
const taskStore = useTaskStore()
const dashboardStore = useDashboardStore()
const projectStore = useProjectStore()
const categoryStore = useCategoryStore()

const route = useRoute()
const activeTab = ref<'logs' | 'notes'>('logs')
const showLogModal = ref(false)
const editVisible = ref(false)
const editLog = ref<WorkLog | null>(null)
const searchKeyword = ref('')
const dayFilter = ref('')
const filterProject = ref<string | null>(null)
const filterCategory = ref<string | null>(null)
const searchResults = ref<WorkLog[]>([])
const quickNote = ref('')

const noteEditVisible = ref(false)
const editingNote = ref<Note | null>(null)
const convertingNote = ref<Note | null>(null)
const workLogPrefill = ref({
  title: '',
  content: '',
  projectId: null as string | null,
  categoryId: null as string | null,
})

const projectOptions = computed<SelectOption[]>(() =>
  projectStore.projects.map((p) => ({ label: p.name, value: p.id })),
)
const categoryOptions = computed<SelectOption[]>(() =>
  categoryStore.categories.map((c) => ({ label: c.name, value: c.id })),
)

const displayLogs = computed(() => {
  let logs = workLogStore.workLogs
  if (searchKeyword.value && activeTab.value === 'logs') {
    logs = searchResults.value
  }
  if (filterProject.value) {
    logs = logs.filter((l) => l.projectId === filterProject.value)
  }
  if (filterCategory.value) {
    logs = logs.filter((l) => l.categoryId === filterCategory.value)
  }
  if (dayFilter.value) logs = logs.filter(log => formatDate(log.createdAt) === dayFilter.value)
  return logs
})

const filteredNotes = computed(() => {
  let notes = noteStore.notes
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (keyword) notes = notes.filter((n) => n.content.toLowerCase().includes(keyword))
  if (filterProject.value) notes = notes.filter((n) => n.projectId === filterProject.value)
  if (filterCategory.value) notes = notes.filter((n) => n.categoryId === filterCategory.value)
  if (dayFilter.value) notes = notes.filter((n) => formatDate(n.createdAt) === dayFilter.value)
  return notes
})

const groupedNotes = computed(() => {
  const groups: { date: string; label: string; items: Note[] }[] = []
  const map = new Map<string, Note[]>()
  for (const note of filteredNotes.value) {
    const date = formatDate(note.createdAt)
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(note)
  }
  for (const [date, items] of map) {
    groups.push({ date, label: dateLabel(date), items })
  }
  return groups
})

function dateLabel(date: string): string {
  if (date === todayLocal()) return '今天'
  if (date === dayjs().subtract(1, 'day').format('YYYY-MM-DD')) return '昨天'
  return date
}

function projectName(id: string) { return projectStore.getProjectName(id) }
function projectColor(id: string) { return projectStore.getProjectColor(id) }
function categoryName(id: string) { return categoryStore.getCategoryName(id) }
function categoryColor(id: string) { return categoryStore.getCategoryColor(id) }
function detailTypeLabel(type: WorkLog['detailType']) { return DETAIL_TYPE_CONFIGS[type].label }

function noteBadge(note: Note): string {
  const labels: string[] = []
  if (note.convertedTaskId) labels.push('已转任务')
  if (note.convertedWorkLogId) labels.push('已转记录')
  return labels.join(' · ')
}

async function handleSearch(kw: string) {
  if (activeTab.value !== 'logs') return
  if (kw.trim()) {
    searchResults.value = await workLogStore.search(kw)
  } else {
    searchResults.value = []
  }
}

function handleFilter() {}

function handleAdd() {
  if (activeTab.value === 'logs') {
    resetWorkLogPrefill()
    convertingNote.value = null
    showLogModal.value = true
  } else {
    noteStore.captureModalVisible = true
  }
}

function checkQueryTab() {
  const tab = route.query.tab
  if (tab === 'notes' || tab === 'logs') activeTab.value = tab
}

watch(() => route.query.tab, checkQueryTab)

watch(activeTab, () => {
  handleSearch(searchKeyword.value)
})

watch(showLogModal, (visible) => {
  if (!visible) {
    convertingNote.value = null
    resetWorkLogPrefill()
  }
})

function handleEdit(log: WorkLog) {
  editLog.value = { ...log }
  editVisible.value = true
}

async function handleSave() {
  if (!editLog.value) return
  await workLogStore.updateWorkLog(editLog.value.id, {
    title: editLog.value.title,
    content: editLog.value.content,
    result: editLog.value.result,
    projectId: editLog.value.projectId,
    categoryId: editLog.value.categoryId,
  })
  message.success('保存成功')
  editVisible.value = false
}

async function handleDelete() {
  if (!editLog.value) return
  await workLogStore.deleteWorkLog(editLog.value.id)
  message.success('已删除')
  editVisible.value = false
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

async function handleNoteUpdated() {
  await noteStore.loadAll()
  await noteStore.loadToday()
}

async function handleDeleteNote(note: Note) {
  await noteStore.deleteNote(note.id)
  message.success('已删除')
}

async function handleConvertTask(note: Note) {
  try {
    await noteStore.convertToTask(note.id)
    await taskStore.loadAll()
    await dashboardStore.loadDashboard()
    message.success('已转为待办任务')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '转换失败')
  }
}

function handleConvertWorkLog(note: Note) {
  const firstLine = note.content.split('\n').map((line) => line.trim()).find(Boolean) ?? ''
  workLogPrefill.value = {
    title: firstLine.length > 60 ? firstLine.slice(0, 60) : firstLine,
    content: note.content,
    projectId: note.projectId,
    categoryId: note.categoryId,
  }
  convertingNote.value = note
  showLogModal.value = true
}

function resetWorkLogPrefill() {
  workLogPrefill.value = { title: '', content: '', projectId: null, categoryId: null }
}

async function handleWorkLogCreated(log: WorkLog) {
  if (convertingNote.value) {
    await noteStore.markConvertedWorkLog(convertingNote.value.id, log.id)
    convertingNote.value = null
  }
  await workLogStore.loadAll()
  await workLogStore.loadToday()
  resetWorkLogPrefill()
}

function openLinkedLog() {
  const log = workLogStore.workLogs.find(item => item.id === route.query.log)
  if (log) handleEdit(log)
}

watch(() => route.query.log, openLinkedLog)
onMounted(async () => {
  await Promise.all([workLogStore.loadAll(), noteStore.loadAll(), noteStore.loadToday()])
  checkQueryTab()
  openLinkedLog()
})
</script>

<style scoped>
.worklog-view {
  width: 100%;
  padding: 32px 40px 64px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
}

.page-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 4px;
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

.view-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 16px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  width: fit-content;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-tab.active {
  background-color: var(--color-background);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-sm);
}

.tab-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.view-tab.active .tab-count {
  color: var(--color-primary);
}

.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  padding: 10px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.filter-bar > * {
  flex: 1;
  min-width: 120px;
}

/* 原生日期控件自己接管配色：靠 color-scheme 切暗色，再对齐 NInput 的外观 */
.filter-bar label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
  white-space: nowrap;
}

.filter-bar input[type='date'] {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--font-size-sm);
  outline: none;
  transition: border-color var(--transition-fast);
}

.filter-bar input[type='date']:focus {
  border-color: var(--color-primary);
}

.timeline {
  position: relative;
  padding-left: 20px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--color-border);
}

.timeline-item {
  position: relative;
  padding-bottom: 20px;
  cursor: pointer;
}

.timeline-dot {
  position: absolute;
  left: -20px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--color-primary);
  border: 2px solid var(--color-background);
}

.timeline-content {
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: 14px;
}

.timeline-content:hover {
  border-color: var(--color-border);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.timeline-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.timeline-body {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.timeline-result {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-style: italic;
  margin-bottom: 8px;
}

.timeline-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.meta-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background-color: var(--color-surface);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.quick-add {
  margin-bottom: 16px;
}

.quick-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  outline: none;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition-fast);
  background-color: var(--color-background);
}

.quick-input:focus {
  border-color: var(--color-primary);
}

.quick-input::placeholder {
  color: var(--color-text-tertiary);
}

.note-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.note-group-date {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.note-card {
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.note-card:hover {
  border-color: var(--color-border);
}

.note-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.note-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.note-badge {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.note-content {
  font-size: var(--font-size-base);
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.note-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.note-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.note-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.note-card:hover .note-actions {
  opacity: 1;
}

.note-action {
  padding: 2px 10px;
  border: 1px solid var(--color-border);
  background-color: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  white-space: nowrap;
}

.note-action:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.note-action.danger:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row > * {
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.footer-right {
  display: flex;
  gap: 12px;
}

@media (max-width: 768px) {
  .worklog-view {
    padding: 20px 14px 48px;
  }

  .note-actions {
    opacity: 1;
  }

  .form-row {
    flex-direction: column;
  }
}
</style>
