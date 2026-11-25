<template>
  <div class="task-item" :class="{ completed: task.status === 'completed' }">
    <button class="task-check" :class="{ checked: task.status === 'completed' }" @click.stop="toggleComplete">
      <span v-if="task.status === 'completed'">✓</span>
    </button>

    <div class="task-content" @click="$emit('click', task)">
      <div class="task-header">
        <span class="task-title">{{ task.title }}</span>
        <div class="task-tags">
          <PriorityTag v-if="showPriority" :priority="task.priority" />
          <StatusTag v-if="showStatus" :status="task.status" />
          <span v-if="task.recurrenceId" class="task-recurrence" title="周期任务实例">周期</span>
          <span v-if="task.remindAt" class="task-remind" :class="{ fired: !!task.remindedAt }" :title="remindTitle">
            ⏰ {{ formatDateTime(task.remindAt, 'HH:mm') }}
          </span>
          <span v-if="task.scheduledDate" class="task-date">{{ formatDate(task.scheduledDate, 'MM-DD') }}</span>
          <span v-if="task.dueDate" class="task-due" :class="{ overdue: isOverdue }">
            截止 {{ formatDate(task.dueDate, 'MM-DD') }}
          </span>
        </div>
      </div>
      <div v-if="task.description" class="task-desc">{{ task.description }}</div>
      <div v-if="showMeta" class="task-meta">
        <span v-if="projectName" class="meta-item">{{ projectName }}</span>
        <span v-if="categoryName" class="meta-item">{{ categoryName }}</span>
        <span class="meta-item">{{ fromNow(task.createdAt) }}</span>
      </div>
    </div>

    <div v-if="showActions" class="task-actions" @click.stop>
      <button class="action-btn" title="移至明天" @click="$emit('move-tomorrow', task)">→</button>
      <button class="action-btn" title="删除" @click="$emit('delete', task)">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'
import PriorityTag from './PriorityTag.vue'
import StatusTag from './StatusTag.vue'
import { formatDate, formatDateTime, fromNow, isPast } from '@/utils/date'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'

const props = withDefaults(defineProps<{
  task: Task
  showPriority?: boolean
  showStatus?: boolean
  showMeta?: boolean
  showActions?: boolean
}>(), {
  showPriority: true,
  showStatus: false,
  showMeta: false,
  showActions: false,
})

const emit = defineEmits<{
  click: [task: Task]
  complete: [task: Task]
  reopen: [task: Task]
  'move-tomorrow': [task: Task]
  delete: [task: Task]
}>()

const projectStore = useProjectStore()
const categoryStore = useCategoryStore()

const projectName = computed(() => projectStore.getProjectName(props.task.projectId))
const categoryName = computed(() => categoryStore.getCategoryName(props.task.categoryId))
const isOverdue = computed(() => props.task.dueDate ? isPast(props.task.dueDate) : false)
const remindTitle = computed(() => {
  if (!props.task.remindAt) return ''
  return props.task.remindedAt ? '提醒已触发' : `将于 ${formatDateTime(props.task.remindAt)} 提醒`
})

function toggleComplete() {
  if (props.task.status === 'completed') {
    emit('reopen', props.task)
  } else {
    emit('complete', props.task)
  }
}
</script>

<style scoped>
.task-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.task-item:hover {
  background-color: var(--color-surface);
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.task-check {
  flex-shrink: 0;
  width: 19px;
  height: 19px;
  border: 1.5px solid var(--color-border);
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-top: 2px;
  font-size: 11px;
  color: white;
}

.task-check:hover {
  border-color: var(--color-primary);
}

.task-check.checked {
  background-color: var(--color-success);
  border-color: var(--color-success);
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-title {
  font-size: var(--font-size-base);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.45;
}

.task-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.task-date,
.task-due {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.task-recurrence {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.task-remind {
  font-size: var(--font-size-xs);
  color: var(--color-warning, #D97706);
  white-space: nowrap;
}

.task-remind.fired {
  color: var(--color-text-tertiary);
  opacity: 0.7;
}

.task-due.overdue {
  color: var(--color-danger);
}

.task-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.meta-item {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.task-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity var(--transition-fast);
}

.task-item:hover .task-actions {
  opacity: 1;
}

.action-btn {
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 16px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.action-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

@media (max-width: 768px) {
  .task-item {
    gap: 9px;
    padding: 10px 8px;
  }

  .task-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .task-tags {
    flex-wrap: wrap;
  }

  .task-desc {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .task-actions {
    opacity: 1;
  }

  .task-actions .action-btn {
    padding: 2px 4px;
  }
}
</style>
