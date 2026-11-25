<template>
  <div class="data-mgmt-view">
    <div class="page-header">
      <h2 class="page-title">数据管理</h2>
    </div>

    <!-- 导出 -->
    <div class="data-section">
      <h3 class="section-title">数据导出</h3>
      <p class="section-desc">导出所有数据用于备份</p>
      <div class="action-list">
        <button class="action-btn" @click="exportJson">
          <span class="action-icon">⬇</span>
          <div>
            <div class="action-label">导出 JSON 备份</div>
            <div class="action-desc">包含所有任务、日志、随记、项目、分类及关联关系</div>
          </div>
        </button>
        <button class="action-btn" @click="exportCsv">
          <span class="action-icon">⬇</span>
          <div>
            <div class="action-label">导出任务 CSV</div>
            <div class="action-desc">导出当前所有任务列表为 CSV 格式</div>
          </div>
        </button>
      </div>
    </div>

    <!-- 导入 -->
    <div class="data-section">
      <h3 class="section-title">数据导入</h3>

      <!-- CSV 批量导入任务 -->
      <div class="import-block">
        <div class="import-block-header">
          <div>
            <h4 class="import-block-title">任务 CSV 批量导入</h4>
            <p class="section-desc">每行一个任务，必填「标题」；项目/分类不存在会自动创建；导入为追加，不影响现有数据。</p>
          </div>
          <button class="action-btn-sm ghost" @click="downloadCsvTemplate">下载 CSV 模板</button>
        </div>
        <input ref="csvInput" type="file" accept=".csv,text/csv" class="file-input" @change="handleCsvSelect" />
        <div v-if="csvPreview" class="import-preview">
          <div class="preview-header">
            <span>CSV 预览</span>
            <span class="preview-version">有效 {{ csvPreview.rows.length }} 条 · 错误 {{ csvPreview.errors.length }} 条</span>
          </div>
          <div v-if="csvPreview.errors.length" class="csv-errors">
            <div v-for="err in csvPreview.errors.slice(0, 5)" :key="err.line" class="csv-error">
              第 {{ err.line }} 条：{{ err.message }}
            </div>
            <div v-if="csvPreview.errors.length > 5" class="csv-error">
              还有 {{ csvPreview.errors.length - 5 }} 条错误…
            </div>
          </div>
          <div v-if="newProjectNames.length || newCategoryNames.length" class="csv-auto-create">
            <span v-if="newProjectNames.length">将自动创建项目：{{ newProjectNames.join('、') }}</span>
            <span v-if="newCategoryNames.length">将自动创建分类：{{ newCategoryNames.join('、') }}</span>
          </div>
          <div class="import-actions">
            <button class="action-btn-sm cancel" @click="cancelCsvImport">取消</button>
            <button
              class="action-btn-sm confirm"
              :disabled="importingCsv || csvPreview.errors.length > 0 || csvPreview.rows.length === 0"
              @click="confirmCsvImport"
            >
              {{ importingCsv ? '导入中...' : `确认导入 ${csvPreview.rows.length} 条` }}
            </button>
          </div>
        </div>
      </div>

      <div class="import-divider"></div>

      <!-- JSON 备份恢复 -->
      <div class="import-block">
        <div class="import-block-header">
          <div>
            <h4 class="import-block-title">JSON 备份恢复</h4>
            <p class="section-desc">确认导入后，备份将替换当前全部数据。</p>
          </div>
        </div>
        <input ref="fileInput" type="file" accept=".json" class="file-input" @change="handleFileSelect" />
        <div v-if="importPreview" class="import-preview">
          <div class="preview-header">
            <span>导入预览</span>
            <span class="preview-version">v{{ importPreview.version }}</span>
          </div>
          <div class="preview-stats">
            <span>任务: {{ importPreview.tasks?.length ?? 0 }}</span>
            <span>日志: {{ importPreview.workLogs?.length ?? 0 }}</span>
            <span>随记: {{ importPreview.notes?.length ?? 0 }}</span>
            <span>项目: {{ importPreview.projects?.length ?? 0 }}</span>
            <span>分类: {{ importPreview.categories?.length ?? 0 }}</span>
          </div>
          <div class="import-actions">
            <button class="action-btn-sm cancel" @click="cancelImport">取消</button>
            <button class="action-btn-sm confirm" :disabled="importing" @click="confirmImport">
              {{ importing ? '导入中...' : '确认导入' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据统计 -->
    <div class="data-section">
      <h3 class="section-title">数据概览</h3>
      <div class="data-stats">
        <div class="data-stat-item">
          <div class="stat-num">{{ dataStats.tasks }}</div>
          <div class="stat-label">任务</div>
        </div>
        <div class="data-stat-item">
          <div class="stat-num">{{ dataStats.workLogs }}</div>
          <div class="stat-label">工作日志</div>
        </div>
        <div class="data-stat-item">
          <div class="stat-num">{{ dataStats.notes }}</div>
          <div class="stat-label">随记</div>
        </div>
        <div class="data-stat-item">
          <div class="stat-num">{{ dataStats.projects }}</div>
          <div class="stat-label">项目</div>
        </div>
        <div class="data-stat-item">
          <div class="stat-num">{{ dataStats.categories }}</div>
          <div class="stat-label">分类</div>
        </div>
      </div>
    </div>

    <!-- 危险操作 -->
    <div class="data-section danger-section">
      <h3 class="section-title danger">危险操作</h3>
      <div class="action-list">
        <button class="action-btn danger" @click="handleReset">
          <span class="action-icon">⚠</span>
          <div>
            <div class="action-label">重置为演示数据</div>
            <div class="action-desc">清除所有数据并重新初始化演示数据</div>
          </div>
        </button>
        <button class="action-btn danger" @click="handleClearAll">
          <span class="action-icon">⚠</span>
          <div>
            <div class="action-label">清空所有数据</div>
            <div class="action-desc">不可恢复，请谨慎操作</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, ref, computed, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useServices } from '@/services'
import { resetToDemoData, clearAllData, initDatabase } from '@/db/seed'
import { useSettingsStore } from '@/stores/settings'
import { useDashboardStore } from '@/stores/dashboard'
import { useTaskStore } from '@/stores/task'
import { useWorkLogStore } from '@/stores/worklog'
import { useNoteStore } from '@/stores/note'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'
import type { BackupData } from '@/types'
import type { TaskCsvParseResult } from '@/services/backup.service'

const message = useMessage()
const services = useServices()
const taskStore = useTaskStore()
const workLogStore = useWorkLogStore()
const noteStore = useNoteStore()
const projectStore = useProjectStore()
const categoryStore = useCategoryStore()

const fileInput = ref<HTMLInputElement | null>(null)
const importPreview = shallowRef<BackupData | null>(null)
const importing = ref(false)
const selectedFile = ref<File | null>(null)

const csvInput = ref<HTMLInputElement | null>(null)
const csvPreview = shallowRef<TaskCsvParseResult | null>(null)
const csvContent = ref('')
const importingCsv = ref(false)

const dataStats = ref({ tasks: 0, workLogs: 0, notes: 0, projects: 0, categories: 0 })

const newProjectNames = computed(() => {
  if (!csvPreview.value) return []
  const existing = new Set(projectStore.projects.map((p) => p.name.trim().toLowerCase()))
  const names = csvPreview.value.rows
    .map((row) => row.projectName.trim())
    .filter((name) => name && !existing.has(name.toLowerCase()))
  return [...new Set(names)]
})

const newCategoryNames = computed(() => {
  if (!csvPreview.value) return []
  const existing = new Set(categoryStore.categories.map((c) => c.name.trim().toLowerCase()))
  const names = csvPreview.value.rows
    .map((row) => row.categoryName.trim())
    .filter((name) => name && !existing.has(name.toLowerCase()))
  return [...new Set(names)]
})

async function loadStats() {
  const data = await services.backup.exportAll()
  dataStats.value = {
    tasks: data.tasks.length,
    workLogs: data.workLogs.length,
    notes: data.notes?.length ?? 0,
    projects: data.projects.length,
    categories: data.categories.length,
  }
}

async function exportJson() {
  const json = await services.backup.exportJson()
  downloadFile(json, `workflow-backup-${Date.now()}.json`, 'application/json')
  message.success('JSON 备份导出成功')
}

async function exportCsv() {
  const csv = await services.backup.exportTasksCsv()
  downloadFile(csv, `workflow-tasks-${Date.now()}.csv`, 'text/csv')
  message.success('CSV 导出成功')
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadCsvTemplate() {
  downloadFile(services.backup.generateTaskCsvTemplate(), 'workflow-tasks-template.csv', 'text/csv')
  message.success('CSV 模板已下载')
}

function handleCsvSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  csvPreview.value = null

  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const buffer = ev.target?.result as ArrayBuffer
      let text = new TextDecoder('utf-8').decode(buffer)
      // Excel 在部分系统默认导出 GBK 编码
      if (text.includes('\uFFFD')) {
        try {
          text = new TextDecoder('gbk').decode(buffer)
        } catch {
          // 浏览器不支持 gbk 时保留 UTF-8 结果
        }
      }
      const parsed = services.backup.parseTasksCsv(text)
      csvContent.value = text
      csvPreview.value = parsed
      if (parsed.errors.length > 0) {
        message.warning(`有 ${parsed.errors.length} 条数据需要修正`)
      } else if (parsed.rows.length === 0) {
        message.info('CSV 中没有可导入的任务')
      } else {
        message.info(`已解析 ${parsed.rows.length} 条任务，请确认后导入`)
      }
    } catch {
      message.error('无法解析 CSV 文件')
    }
  }
  reader.readAsArrayBuffer(file)
}

function cancelCsvImport() {
  csvPreview.value = null
  csvContent.value = ''
  if (csvInput.value) csvInput.value.value = ''
}

async function confirmCsvImport() {
  if (!csvPreview.value || csvPreview.value.errors.length > 0) return
  importingCsv.value = true
  try {
    const result = await services.backup.importTasksCsv(csvContent.value)
    const extras = [
      result.createdProjects.length ? `自动创建项目 ${result.createdProjects.length} 个` : '',
      result.createdCategories.length ? `自动创建分类 ${result.createdCategories.length} 个` : '',
    ].filter(Boolean).join('，')
    message.success(`导入成功，新增 ${result.imported} 条任务${extras ? `，${extras}` : ''}`)
    cancelCsvImport()
    await reloadAll()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导入失败，请重试')
  } finally {
    importingCsv.value = false
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  importPreview.value = null
  selectedFile.value = file

  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      if (selectedFile.value !== file) return
      const data = JSON.parse(ev.target?.result as string) as BackupData
      const validation = services.backup.validateBackup(data)
      if (!validation.valid) {
        message.error(`文件格式错误：${validation.errors.join(', ')}`)
        return
      }
      importPreview.value = data
      message.info('文件已加载，请确认后导入')
    } catch {
      message.error('无法解析文件，请确认是有效的 JSON 备份')
    }
  }
  reader.readAsText(file)
}

function cancelImport() {
  importPreview.value = null
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

async function confirmImport() {
  if (!importPreview.value) return
  importing.value = true
  try {
    const result = await services.backup.importBackup(importPreview.value)
    message.success(`导入成功，共 ${result.imported} 条数据`)
    await reloadAll()
    cancelImport()
  } catch {
    message.error('导入失败，请重试')
  } finally {
    importing.value = false
  }
}

async function handleReset() {
  if (!confirm('确定要重置为演示数据吗？当前所有数据将被清除。')) return
  await resetToDemoData()
  message.success('已重置为演示数据')
  await reloadAll()
}

async function handleClearAll() {
  if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return
  if (!confirm('再次确认：所有任务、日志、项目、分类都将被删除。')) return
  await clearAllData()
  await initDatabase()
  message.success('所有数据已清空')
  await reloadAll()
}

async function reloadAll() {
  await Promise.all([
    useSettingsStore().loadSettings(),
    useDashboardStore().loadDashboard(),
    workLogStore.loadToday(),
    taskStore.loadAll(),
    projectStore.loadAll(),
    categoryStore.loadAll(),
    workLogStore.loadAll(),
    noteStore.loadAll(),
    noteStore.loadToday(),
  ])
  await loadStats()
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.data-mgmt-view {
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

.data-section {
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.danger-section {
  border-color: var(--color-danger-light);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 4px;
}

.section-title.danger {
  color: var(--color-danger);
}

.section-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  border-color: var(--color-primary);
}

.action-btn.danger:hover {
  border-color: var(--color-danger);
}

.action-icon {
  font-size: 20px;
  color: var(--color-text-tertiary);
}

.action-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.action-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.import-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-input {
  font-size: var(--font-size-sm);
}

.import-preview {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 12px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  margin-bottom: 8px;
}

.preview-version {
  color: var(--color-text-tertiary);
}

.preview-stats {
  display: flex;
  gap: 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.action-btn-sm {
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.action-btn-sm.cancel {
  border: 1px solid var(--color-border);
  background-color: transparent;
  color: var(--color-text-secondary);
}

.action-btn-sm.confirm {
  background-color: var(--color-primary);
  border: none;
  color: white;
}

.action-btn-sm.confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn-sm.ghost {
  border: 1px solid var(--color-border);
  background-color: transparent;
  color: var(--color-primary);
  white-space: nowrap;
}

.action-btn-sm.ghost:hover {
  border-color: var(--color-primary);
}

.import-block-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.import-block-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 2px;
}

.import-block .section-desc {
  margin-bottom: 12px;
}

.import-divider {
  height: 1px;
  background-color: var(--color-border-light);
  margin: 20px 0;
}

.csv-errors {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.csv-error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
}

.csv-auto-create {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.data-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.data-stat-item {
  text-align: center;
  padding: 16px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.stat-num {
  font-size: 24px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: 4px;
}

@media (max-width: 768px) {
  .data-mgmt-view {
    padding: 20px 14px 48px;
  }

  .data-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
