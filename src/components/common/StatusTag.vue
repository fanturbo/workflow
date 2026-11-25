<template>
  <span class="status-tag" :style="{ color: config.color, backgroundColor: config.color + '15' }">
    {{ config.label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TaskStatus } from '@/types'
import { STATUS_CONFIGS } from '@/constants/task'

const props = defineProps<{ status: TaskStatus }>()

const config = computed(() => STATUS_CONFIGS[props.status])
</script>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
</style>
