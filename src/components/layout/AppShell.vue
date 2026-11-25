<template>
  <div class="app-shell">
    <!-- 移动端遮罩 -->
    <div v-if="!sidebarCollapsed && isMobile" class="sidebar-backdrop" @click="layoutStore.collapse()" />

    <AppSidebar :collapsed="sidebarCollapsed" />
    <div class="app-main">
      <AppHeader @toggle-sidebar="toggleSidebar" @quick-add-task="handleQuickAddTask" @quick-add-note="handleQuickAddNote" />
      <main class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 全局弹窗 -->
    <TaskCreateModal v-model:show="taskCreateVisible" @created="handleTaskCreated" />
    <WorkLogCreateModal
      v-model:show="workLogCreateVisible"
      :initial-title="workLogPrefill.title"
      :initial-content="workLogPrefill.content"
      :initial-project-id="workLogPrefill.projectId"
      :initial-category-id="workLogPrefill.categoryId"
      @created="handleLogCreated"
    />
    <NoteCaptureModal v-model:show="noteCaptureVisible" @created="handleNoteCreated" @switch-to-worklog="handleSwitchToWorkLog" />
    <ReminderHost />
    <ReminderCenter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import TaskCreateModal from '@/components/common/TaskCreateModal.vue'
import WorkLogCreateModal from '@/components/common/WorkLogCreateModal.vue'
import NoteCaptureModal from '@/components/common/NoteCaptureModal.vue'
import ReminderHost from '@/components/common/ReminderHost.vue'
import ReminderCenter from '@/components/common/ReminderCenter.vue'
import { useTaskStore } from '@/stores/task'
import { useWorkLogStore } from '@/stores/worklog'
import { useNoteStore } from '@/stores/note'
import { useDashboardStore } from '@/stores/dashboard'
import { useLayoutStore } from '@/stores/layout'

const router = useRouter()
const taskStore = useTaskStore()
const workLogStore = useWorkLogStore()
const noteStore = useNoteStore()
const dashboardStore = useDashboardStore()
const layoutStore = useLayoutStore()

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)
const sidebarCollapsed = computed({
  get: () => layoutStore.sidebarCollapsed,
  set: (v: boolean) => { layoutStore.sidebarCollapsed = v },
})

const taskCreateVisible = computed({
  get: () => taskStore.createModalVisible,
  set: (v: boolean) => { taskStore.createModalVisible = v },
})

const workLogCreateVisible = computed({
  get: () => workLogStore.createModalVisible,
  set: (v: boolean) => { workLogStore.createModalVisible = v },
})

const noteCaptureVisible = computed({
  get: () => noteStore.captureModalVisible,
  set: (v: boolean) => { noteStore.captureModalVisible = v },
})

const workLogPrefill = ref({
  title: '',
  content: '',
  projectId: null as string | null,
  categoryId: null as string | null,
})

function toggleSidebar() {
  layoutStore.toggleSidebar()
}

function handleQuickAddTask() {
  taskStore.createModalVisible = true
}

function handleQuickAddNote() {
  noteStore.captureModalVisible = true
}

function handleSwitchToWorkLog(payload: { content: string; projectId: string | null; categoryId: string | null }) {
  const firstLine = payload.content.split('\n').map((line) => line.trim()).find(Boolean) ?? ''
  workLogPrefill.value = {
    title: firstLine.length > 60 ? firstLine.slice(0, 60) : firstLine,
    content: payload.content,
    projectId: payload.projectId,
    categoryId: payload.categoryId,
  }
  workLogStore.createModalVisible = true
}

function resetWorkLogPrefill() {
  workLogPrefill.value = { title: '', content: '', projectId: null, categoryId: null }
}

async function handleNoteCreated() {
  await noteStore.loadToday()
}

async function handleTaskCreated() {
  await taskStore.loadAll()
  await dashboardStore.loadDashboard()
}

async function handleLogCreated() {
  await workLogStore.loadToday()
  await workLogStore.loadAll()
  resetWorkLogPrefill()
}

watch(workLogCreateVisible, (visible) => {
  if (!visible) resetWorkLogPrefill()
})

// 路由切换时在移动端关闭侧边栏
watch(() => router.currentRoute.value.path, () => {
  if (isMobile.value) {
    layoutStore.collapse()
  }
})

function handleResize() {
  windowWidth.value = window.innerWidth
  layoutStore.sidebarCollapsed = window.innerWidth < 1100
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.app-shell {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  min-width: 0;
  background: var(--color-surface);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-surface);
  min-width: 0;
  overscroll-behavior: contain;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.46);
  backdrop-filter: blur(2px);
  z-index: var(--z-sidebar);
}
</style>
