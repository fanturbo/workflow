<template>
  <span class="priority-tag" :style="{ color: config.color, backgroundColor: config.color + '15' }">
    {{ config.label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TaskPriority } from '@/types'
import { PRIORITY_CONFIGS } from '@/constants/task'

const props = defineProps<{ priority: TaskPriority }>()

const config = computed(() => PRIORITY_CONFIGS[props.priority])
</script>

<style scoped>
.priority-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
</style>
