<template>
  <NModal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    :title="modalTitle"
    :style="{ width: '640px', maxWidth: '90vw' }"
    :bordered="false"
    size="medium"
    @after-leave="resetForm"
  >
    <div class="log-type-tabs">
      <button
        v-for="opt in detailTypeOptions"
        :key="opt.value"
        class="type-tab"
        :class="{ active: form.detailType === opt.value }"
        @click="form.detailType = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <NForm ref="formRef" :model="form" :rules="rules" label-placement="top">
      <NFormItem label="标题" path="title">
        <NInput
          v-model:value="form.title"
          placeholder="输入工作日志标题..."
          @keydown.enter="handleSubmit"
        />
      </NFormItem>

      <!-- 快速记录：只有标题 -->
      <template v-if="form.detailType === 'quick'">
        <div class="quick-hint">快速记录会自动生成创建时间，后续可补充详情</div>
      </template>

      <!-- 标准记录 -->
      <template v-else-if="form.detailType === 'standard'">
        <NFormItem label="工作内容" path="content">
          <NInput v-model:value="form.content" type="textarea" :rows="3" placeholder="记录做了什么..." />
        </NFormItem>
        <NFormItem label="工作成果" path="result">
          <NInput v-model:value="form.result" type="textarea" :rows="2" placeholder="实际成果..." />
        </NFormItem>
      </template>

      <!-- 详细记录 -->
      <template v-else>
        <NFormItem label="工作背景" path="background">
          <NInput v-model:value="form.background" type="textarea" :rows="2" placeholder="工作背景..." />
        </NFormItem>
        <NFormItem label="具体过程" path="process">
          <NInput v-model:value="form.process" type="textarea" :rows="3" placeholder="具体过程..." />
        </NFormItem>
        <NFormItem label="解决方案" path="solution">
          <NInput v-model:value="form.solution" type="textarea" :rows="2" placeholder="解决方案..." />
        </NFormItem>
        <NFormItem label="实际成果" path="result">
          <NInput v-model:value="form.result" type="textarea" :rows="2" placeholder="实际成果..." />
        </NFormItem>
        <NFormItem label="遗留问题" path="remainingIssues">
          <NInput v-model:value="form.remainingIssues" type="textarea" :rows="2" placeholder="遗留问题..." />
        </NFormItem>
      </template>

      <div class="form-row" v-if="form.detailType !== 'quick'">
        <NFormItem label="开始时间" path="startedAt">
          <NDatePicker
            v-model:formatted-value="form.startedAt"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm"
            clearable
          />
        </NFormItem>
        <NFormItem label="结束时间" path="endedAt">
          <NDatePicker
            v-model:formatted-value="form.endedAt"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm"
            clearable
          />
        </NFormItem>
      </div>

      <div class="form-row">
        <NFormItem label="项目" path="projectId">
          <NSelect v-model:value="form.projectId" :options="projectOptions" clearable placeholder="选择项目" />
        </NFormItem>
        <NFormItem label="分类" path="categoryId">
          <NSelect v-model:value="form.categoryId" :options="categoryOptions" clearable placeholder="选择分类" />
        </NFormItem>
      </div>

      <NFormItem label="关联任务" path="taskIds">
        <NSelect
          v-model:value="form.taskIds"
          :options="taskOptions"
          multiple
          clearable
          filterable
          placeholder="选择关联任务（可多选）"
          :max-tag-count="3"
        />
      </NFormItem>
    </NForm>

    <template #footer>
      <div class="modal-footer">
        <NButton @click="$emit('update:show', false)">取消</NButton>
        <NButton type="primary" :loading="submitting" @click="handleSubmit">
          保存记录
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NDatePicker,
  NButton,
  useMessage,
  type SelectOption,
} from 'naive-ui'
import type { WorkLog, WorkLogDetailType } from '@/types'
import { DETAIL_TYPE_CONFIGS } from '@/constants/task'
import { useWorkLogStore } from '@/stores/worklog'
import { useTaskStore } from '@/stores/task'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'

const props = defineProps<{
  show: boolean
  initialTitle?: string
  initialContent?: string
  initialProjectId?: string | null
  initialCategoryId?: string | null
}>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  created: [log: WorkLog]
}>()

const message = useMessage()
const workLogStore = useWorkLogStore()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const categoryStore = useCategoryStore()

const submitting = ref(false)

function emptyForm() {
  return {
    title: '',
    content: '',
    result: '',
    background: '',
    process: '',
    solution: '',
    remainingIssues: '',
    startedAt: null as string | null,
    endedAt: null as string | null,
    detailType: 'standard' as WorkLogDetailType,
    projectId: null as string | null,
    categoryId: null as string | null,
    taskIds: [] as string[],
  }
}

const form = ref(emptyForm())

const rules = {
  title: { required: true, message: '请输入日志标题', trigger: ['blur', 'input'] },
}

const detailTypeOptions = (Object.keys(DETAIL_TYPE_CONFIGS) as WorkLogDetailType[]).map((k) => ({
  value: k,
  label: DETAIL_TYPE_CONFIGS[k].label,
}))

const modalTitle = computed(() => {
  const labels: Record<WorkLogDetailType, string> = {
    quick: '快速记录',
    standard: '标准记录',
    detailed: '详细记录',
  }
  return labels[form.value.detailType]
})

const projectOptions = computed<SelectOption[]>(() =>
  projectStore.projects.map((p) => ({ label: p.name, value: p.id })),
)

const categoryOptions = computed<SelectOption[]>(() =>
  categoryStore.categories.map((c) => ({ label: c.name, value: c.id })),
)

const taskOptions = computed<SelectOption[]>(() =>
  taskStore.tasks
    .filter((t) => !t.archivedAt && t.status !== 'cancelled')
    .map((t) => ({ label: t.title, value: t.id })),
)

function resetForm() {
  form.value = emptyForm()
}

watch(() => props.show, (val) => {
  if (!val) return
  form.value = emptyForm()
  if (props.initialTitle) form.value.title = props.initialTitle
  if (props.initialContent) form.value.content = props.initialContent
  if (props.initialProjectId) form.value.projectId = props.initialProjectId
  if (props.initialCategoryId) form.value.categoryId = props.initialCategoryId
})

async function handleSubmit() {
  if (!form.value.title.trim()) {
    message.warning('请输入日志标题')
    return
  }
  submitting.value = true
  try {
    const log = await workLogStore.createWorkLog({
      title: form.value.title.trim(),
      content: form.value.content,
      result: form.value.result,
      background: form.value.background,
      process: form.value.process,
      solution: form.value.solution,
      remainingIssues: form.value.remainingIssues,
      startedAt: form.value.startedAt,
      endedAt: form.value.endedAt,
      detailType: form.value.detailType,
      projectId: form.value.projectId,
      categoryId: form.value.categoryId,
      taskIds: form.value.taskIds,
    })
    message.success('工作记录保存成功')
    emit('update:show', false)
    emit('created', log)
    resetForm()
  } catch {
    message.error('保存失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.log-type-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background-color: var(--color-surface);
  padding: 4px;
  border-radius: var(--radius-md);
}

.type-tab {
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.type-tab.active {
  background-color: var(--color-background);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-sm);
}

.quick-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  padding: 8px 0;
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
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
