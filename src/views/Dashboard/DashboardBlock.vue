<template>
  <div class="dashboard-block" :class="[`block-${block.type}`, { collapsed: !expanded }]">
    <div class="block-header" @click="toggleExpand">
      <div class="block-header-left">
        <span class="block-toggle">{{ expanded ? '▾' : '▸' }}</span>
        <span class="block-icon">{{ iconChar }}</span>
        <div class="block-copy">
          <div class="block-name">
            <span class="block-title">{{ block.label }}</span>
            <span class="block-count">{{ tasks.length }}</span>
          </div>
          <span class="block-desc">{{ block.description }}</span>
        </div>
      </div>
      <div class="block-header-right">
        <button class="block-add-btn" title="快速新增" @click.stop="toggleQuickAdd">
          <span>＋</span>
        </button>
      </div>
    </div>

    <div v-show="expanded" class="block-body">
      <!-- 内联快速新增 -->
      <div v-if="showQuickAdd" class="block-quick-add">
        <input
          ref="quickInput"
          v-model="quickTitle"
          class="block-quick-input"
          placeholder="输入任务名称，Enter 保存..."
          @keydown.enter="handleQuickAdd"
          @keydown.escape="cancelQuickAdd"
          @blur="cancelQuickAddIfEmpty"
        />
      </div>

      <draggable
        v-if="droppable"
        :list="localTasks"
        :group="{ name: 'dashboard-tasks', pull: true, put: true }"
        item-key="id"
        animation="180"
        ghost-class="task-ghost"
        chosen-class="task-chosen"
        drag-class="task-drag"
        class="task-list"
        :data-empty="localTasks.length === 0"
        @change="onTaskChange"
      >
        <template #item="{ element: task }">
          <TaskItem
            :task="task"
            :show-priority="true"
            :show-status="false"
            :show-actions="true"
            @click="$emit('task-click', $event)"
            @complete="$emit('task-complete', $event)"
            @reopen="$emit('task-reopen', $event)"
            @move-tomorrow="$emit('task-move-tomorrow', $event)"
            @delete="$emit('task-delete', $event)"
          />
        </template>
        <template #footer>
          <div v-if="localTasks.length === 0 && !showQuickAdd" class="empty-state">
            <div class="empty-state-text">暂无任务</div>
          </div>
        </template>
      </draggable>
      <template v-else>
        <div v-if="localTasks.length === 0 && !showQuickAdd" class="empty-state">
          <div class="empty-state-text">暂无任务</div>
        </div>
        <div v-else class="task-list">
          <TaskItem
            v-for="task in localTasks"
            :key="task.id"
            :task="task"
            :show-priority="true"
            :show-status="false"
            :show-actions="true"
            @click="$emit('task-click', $event)"
            @complete="$emit('task-complete', $event)"
            @reopen="$emit('task-reopen', $event)"
            @move-tomorrow="$emit('task-move-tomorrow', $event)"
            @delete="$emit('task-delete', $event)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'
import type { Task, DashboardBlockType } from '@/types'
import TaskItem from '@/components/common/TaskItem.vue'

const props = defineProps<{
  block: { type: DashboardBlockType; label: string; description: string }
  tasks: Task[]
  droppable?: boolean
}>()

const emit = defineEmits<{
  'task-click': [task: Task]
  'task-complete': [task: Task]
  'task-reopen': [task: Task]
  'task-move-tomorrow': [task: Task]
  'task-delete': [task: Task]
  'quick-add': [title: string, blockType: DashboardBlockType]
  'task-drop': [task: Task, targetBlock: DashboardBlockType]
}>()

const expanded = ref(true)
const showQuickAdd = ref(false)
const quickTitle = ref('')
const quickInput = ref<HTMLInputElement | null>(null)

// 本地可变副本，供 vuedraggable 直接操作
const localTasks = ref<Task[]>([...props.tasks])

// store 刷新后同步到本地（延迟一帧避免拖拽中覆盖）
let syncing = false
watch(() => props.tasks, (val) => {
  if (syncing) return
  syncing = true
  localTasks.value = [...val]
  nextTick(() => { syncing = false })
}, { immediate: true })

const droppable = computed(() => props.droppable !== false)

const iconChar = computed(() => {
  const icons: Record<string, string> = {
    must_finish_today: '✓',
    this_week: '→',
    long_term: '◇',
    daily_routine: '↻',
  }
  return icons[props.block.type] ?? '•'
})

function toggleExpand() {
  expanded.value = !expanded.value
}

async function toggleQuickAdd() {
  showQuickAdd.value = !showQuickAdd.value
  if (showQuickAdd.value) {
    await nextTick()
    quickInput.value?.focus()
  }
}

function handleQuickAdd() {
  if (!quickTitle.value.trim()) return
  emit('quick-add', quickTitle.value.trim(), props.block.type)
  quickTitle.value = ''
  showQuickAdd.value = false
}

function cancelQuickAdd() {
  showQuickAdd.value = false
  quickTitle.value = ''
}

function cancelQuickAddIfEmpty() {
  if (!quickTitle.value.trim()) {
    showQuickAdd.value = false
  }
}

/**
 * 跨区块拖入 — 必须用 change.added.element。
 * 原生 @add 透传的是 SortableJS 事件，只有 item(DOM)/newIndex，
 * 没有 element（见 vuedraggable.umd.js onDragAdd），取不到会导致写入被跳过。
 */
function onTaskChange(evt: { added?: { element: Task; newIndex: number } }) {
  if (!evt.added) return // 同列表排序是 moved，不是 added
  emit('task-drop', evt.added.element, props.block.type)
}
</script>

<style scoped>
.dashboard-block {
  height: 100%;
  background: var(--block-bg);
  border: 1px solid var(--block-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.block-must_finish_today {
  grid-column: span 2;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 50px;
  padding: 11px 14px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.block-header:hover {
  background-color: var(--block-overlay-soft);
}

.block-header-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.block-toggle {
  font-size: 10px;
  color: var(--color-text-tertiary);
  width: 12px;
}

.block-icon {
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  flex: 0 0 auto;
  background: var(--block-overlay);
  color: var(--block-accent);
  font-weight: 700;
  font-size: 14px;
}

.block-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.block-copy {
  min-width: 0;
}

.block-name {
  display: flex;
  align-items: center;
  gap: 7px;
}

.block-count {
  font-size: var(--font-size-xs);
  color: var(--block-accent);
  background-color: var(--block-overlay);
  min-width: 22px;
  text-align: center;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.block-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.block-desc {
  display: block;
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block-add-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--block-overlay-strong);
  background-color: var(--block-overlay);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.block-add-btn:hover {
  border-color: var(--block-accent);
  color: var(--block-accent);
}

.block-body {
  padding: 0 10px 10px;
}

.block-quick-add {
  padding: 8px 4px 4px;
}

.block-quick-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--block-accent);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  outline: none;
  background-color: var(--color-background);
  color: var(--color-text);
}

.block-quick-input::placeholder {
  color: var(--color-text-tertiary);
}

.task-list {
  display: flex;
  flex-direction: column;
  min-height: 32px;
  border-radius: var(--radius-md);
  transition: background 150ms ease;
}

.task-list[data-empty="true"] {
  min-height: 48px;
  border: 1.5px dashed transparent;
}

.task-list:has(.task-ghost) {
  background: var(--block-ghost);
  border-color: var(--block-accent) !important;
}

:deep(.task-ghost) {
  opacity: 0.4;
  background: var(--block-accent) !important;
}

:deep(.task-chosen) {
  opacity: 0.7;
}

:deep(.task-drag) {
  box-shadow: var(--shadow-md);
  transform: rotate(1deg);
}

.dashboard-block :deep(.task-item) {
  background: var(--block-card);
  margin-top: 5px;
}

.dashboard-block :deep(.task-item:hover) {
  background: var(--block-card-hover);
}

.dashboard-block :deep(.task-header) {
  align-items: flex-start;
  flex-direction: column;
  gap: 5px;
}

.dashboard-block :deep(.task-tags) {
  flex-wrap: wrap;
}

.dashboard-block :deep(.task-desc) {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 768px) {
  .block-must_finish_today {
    grid-column: span 1;
  }

  .block-header {
    padding: 10px 12px;
  }

  .block-body {
    padding: 0 4px 8px;
  }
}
</style>
