<template>
  <div class="review-view">
    <div class="page-header">
      <h2 class="page-title">工作复盘</h2>
      <div class="range-selector">
        <button class="range-btn" :class="{active: selectedDays === -1}" @click="selectRange(-1)">自定义</button>
        <button class="range-btn" :class="{active: selectedDays === 0}" @click="selectRange(0)">本周</button>
        <button
          v-for="r in REVIEW_RANGES"
          :key="r.value"
          :class="['range-btn', { active: selectedDays === r.value }]"
          @click="selectRange(r.value)"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <form v-if="selectedDays === -1" class="range-selector" @submit.prevent="loadStats">
      <label>开始日期 <input type="date" required v-model="customStart" :max="customEnd" /></label>
      <label>结束日期 <input type="date" required v-model="customEnd" :min="customStart" /></label>
      <button class="range-btn">查看</button>
    </form>
    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-num">{{ stats.newTaskCount }}</div>
        <div class="stat-label">新建任务</div>
      </div>
      <div class="stat-card">
        <div class="stat-num completed">{{ stats.completedTaskCount }}</div>
        <div class="stat-label">完成任务</div>
      </div>
      <div class="stat-card">
        <div class="stat-num pending">{{ stats.pendingTaskCount }}</div>
        <div class="stat-label">未完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-num overdue">{{ stats.overdueTaskCount }}</div>
        <div class="stat-label">逾期任务</div>
      </div>
      <div class="stat-card">
        <div class="stat-num log">{{ stats.workLogCount }}</div>
        <div class="stat-label">工作日志</div>
      </div>
    </div>

    <!-- 趋势图 -->
    <div class="chart-section">
      <h3 class="chart-title">每日完成趋势</h3>
      <div ref="trendChartRef" class="chart-box"></div>
    </div>

    <!-- 分布图 -->
    <div class="charts-row">
      <div class="chart-section">
        <h3 class="chart-title">分类分布</h3>
        <div ref="categoryChartRef" class="chart-box small"></div>
      </div>
      <div class="chart-section">
        <h3 class="chart-title">优先级分布</h3>
        <div ref="priorityChartRef" class="chart-box small"></div>
      </div>
    </div>

    <div v-if="stats.projectDistribution.length" class="completed-section">
      <h3 class="section-title">项目成果</h3>
      <div v-for="project in stats.projectDistribution" :key="project.projectId" class="completed-item">{{ project.projectName }} · {{ project.count }} 项</div>
    </div>
    <!-- 完成任务列表 -->
    <div class="completed-section">
      <h3 class="section-title">工作成果 ({{ stats.completedTasks.length }})</h3>
      <div v-if="stats.completedTasks.length === 0" class="empty-state-text">暂无完成任务</div>
      <div v-else class="completed-list">
        <div v-for="task in stats.completedTasks" :key="task.id + task.completedAt" class="completed-item">
          <span class="completed-check">✓</span>
          <span class="completed-title">{{ task.title }}</span>
          <span class="completed-date">{{ formatDate(task.completedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 导出 -->
    <div class="export-section">
      <button class="export-btn" @click="exportCsv">导出 CSV</button>
      <button class="export-btn" @click="exportJson">导出 JSON</button>
      <button class="export-btn" @click="copyReport">复制工作总结</button>
      <button class="export-btn" @click="exportMarkdown">导出 Markdown 总结</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useMessage } from 'naive-ui'
import { useServices } from '@/services'
import { useLayoutStore } from '@/stores/layout'
import { REVIEW_RANGES, PRIORITY_CONFIGS } from '@/constants/task'
import { lastNDays, formatDate, todayLocal, startOfWeek } from '@/utils/date'
import type { ReviewStatistics } from '@/types'

const message = useMessage()
const services = useServices()

const selectedDays = ref(7)
const customStart = ref(lastNDays(7).start)
const customEnd = ref(todayLocal())
let statsRequest = 0
const stats = ref<ReviewStatistics>({
  range: { start: '', end: '' },
  newTaskCount: 0,
  completedTaskCount: 0,
  pendingTaskCount: 0,
  overdueTaskCount: 0,
  workLogCount: 0,
  trend: [],
  categoryDistribution: [],
  projectDistribution: [],
  priorityDistribution: [],
  completedTasks: [],
})

const trendChartRef = ref<HTMLDivElement | null>(null)
const categoryChartRef = ref<HTMLDivElement | null>(null)
const priorityChartRef = ref<HTMLDivElement | null>(null)

let trendChart: echarts.ECharts | null = null
let categoryChart: echarts.ECharts | null = null
let priorityChart: echarts.ECharts | null = null

async function loadStats() {
  const request = ++statsRequest
  let range = lastNDays(selectedDays.value)
  if (selectedDays.value === 0) range = { start: startOfWeek(), end: todayLocal() }
  if (selectedDays.value === -1) range = { start: customStart.value, end: customEnd.value }
  const result = await services.statistics.getReviewStatistics(range.start, range.end)
  if (request !== statsRequest) return
  stats.value = result
  await nextTick()
  renderCharts()
}

function selectRange(days: number) {
  selectedDays.value = days
}

const layoutStore = useLayoutStore()

/** 从 CSS 变量读取当前主题图表配色，切换主题后重新渲染即可同步 */
function chartPalette() {
  const s = getComputedStyle(document.documentElement)
  const v = (name: string) => s.getPropertyValue(name).trim()
  return {
    text: v('--chart-text'),
    axis: v('--chart-axis'),
    split: v('--chart-split'),
    tooltipBg: v('--chart-tooltip-bg'),
    tooltipBorder: v('--chart-tooltip-border'),
    created: v('--chart-created'),
    createdArea: v('--chart-created-area'),
    completed: v('--chart-completed'),
    completedArea: v('--chart-completed-area'),
  }
}

function chartTooltip(trigger: 'axis' | 'item') {
  const p = chartPalette()
  return {
    trigger,
    backgroundColor: p.tooltipBg,
    borderColor: p.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: p.text, fontSize: 12 },
  }
}

// 主题切换时立即重绘图表
watch(() => layoutStore.isDark, () => { renderCharts() })

function renderCharts() {
  renderTrendChart()
  renderCategoryChart()
  renderPriorityChart()
}

function renderTrendChart() {
  if (!trendChartRef.value) return
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }
  const p = chartPalette()
  const data = stats.value.trend
  trendChart.setOption({
    tooltip: chartTooltip('axis'),
    legend: { data: ['新建', '完成'], bottom: 0, textStyle: { color: p.text } },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: data.map((d) => formatDate(d.date, 'MM-DD')),
      axisLine: { lineStyle: { color: p.axis } },
      axisLabel: { color: p.text, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: p.split } },
      axisLabel: { color: p.text, fontSize: 11 },
    },
    series: [
      {
        name: '新建',
        type: 'line',
        data: data.map((d) => d.created),
        smooth: true,
        itemStyle: { color: p.created },
        areaStyle: { color: p.createdArea },
      },
      {
        name: '完成',
        type: 'line',
        data: data.map((d) => d.completed),
        smooth: true,
        itemStyle: { color: p.completed },
        areaStyle: { color: p.completedArea },
      },
    ],
  })
}

function renderCategoryChart() {
  if (!categoryChartRef.value) return
  if (!categoryChart) {
    categoryChart = echarts.init(categoryChartRef.value)
  }
  const p = chartPalette()
  const data = stats.value.categoryDistribution
  const hasData = data.length > 0
  // 空数据时 ECharts 会画一个浅灰占位圆环，暗色下极刺眼——换成居中的提示文字
  const option: echarts.EChartsOption = hasData
    ? {
        tooltip: chartTooltip('item'),
        title: { show: false },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            itemStyle: { borderColor: p.tooltipBg, borderWidth: 2 },
            data: data.map((d) => ({
              name: d.categoryName,
              value: d.count,
              itemStyle: { color: d.color },
            })),
            label: { color: p.text, fontSize: 11 },
          },
        ],
      }
    : {
        tooltip: { show: false },
        title: {
          text: '暂无分类数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: p.text,
            fontSize: 13,
            fontWeight: 400,
          },
        },
        series: [],
      }
  // notMerge：空态与非空态来回切时要清掉上一次残留的 series / title
  categoryChart.setOption(option, true)
}

function renderPriorityChart() {
  if (!priorityChartRef.value) return
  if (!priorityChart) {
    priorityChart = echarts.init(priorityChartRef.value)
  }
  const p = chartPalette()
  const data = stats.value.priorityDistribution
  priorityChart.setOption({
    tooltip: chartTooltip('axis'),
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.priority),
      axisLabel: { color: p.text, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: p.split } },
      axisLabel: { color: p.text, fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => ({ value: d.count, itemStyle: { color: PRIORITY_CONFIGS[d.priority].color } })),
        barWidth: 30,
      },
    ],
  })
}

function handleResize() {
  trendChart?.resize()
  categoryChart?.resize()
  priorityChart?.resize()
}

async function exportCsv() {
  const csv = await services.backup.exportTasksCsv()
  downloadFile(csv, 'tasks.csv', 'text/csv')
  message.success('CSV 导出成功')
}

async function exportJson() {
  const json = await services.backup.exportJson()
  downloadFile(json, 'workflow-backup.json', 'application/json')
  message.success('JSON 导出成功')
}

async function copyReport() {
  try {
    const { start, end } = stats.value.range
    await navigator.clipboard.writeText(await services.backup.exportMarkdownSummary(start, end))
    message.success('工作总结已复制')
  } catch {
    message.error('复制失败，可使用 Markdown 导出')
  }
}

async function exportMarkdown() {
  const range = stats.value.range
  const md = await services.backup.exportMarkdownSummary(range.start, range.end)
  downloadFile(md, 'work-summary.md', 'text/markdown')
  message.success('Markdown 总结导出成功')
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

onMounted(() => {
  loadStats()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  categoryChart?.dispose()
  priorityChart?.dispose()
})

watch(selectedDays, () => loadStats())
</script>

<style scoped>
.review-view {
  width: 100%;
  padding: 32px 40px 64px;
  max-width: 1440px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
}

.range-selector {
  display: flex;
  gap: 4px;
  background-color: var(--color-surface);
  padding: 3px;
  border-radius: var(--radius-md);
}

.range-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.range-btn.active {
  background-color: var(--color-background);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-sm);
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background-color: var(--color-background);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
}

.stat-num {
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.stat-num.completed { color: var(--color-success); }
.stat-num.pending { color: var(--color-primary); }
.stat-num.overdue { color: var(--color-danger); }
.stat-num.log { color: var(--color-warning); }

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.chart-section {
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
}

.chart-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 12px;
}

.chart-box {
  width: 100%;
  height: 280px;
}

.chart-box.small {
  height: 240px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.completed-section {
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 12px;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.completed-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-sm);
}

.completed-check {
  color: var(--color-success);
  font-weight: bold;
}

.completed-title {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.completed-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.export-section {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.export-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.export-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .review-view {
    padding: 20px 14px 48px;
  }

  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
