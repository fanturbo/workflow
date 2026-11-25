<template>
  <NModal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    :title="note ? '编辑随记' : '随手记'"
    :style="{ width: '560px', maxWidth: '90vw' }"
    :bordered="false"
    size="medium"
    @after-leave="resetForm"
  >
    <div class="note-capture">
      <NInput
        ref="inputRef"
        v-model:value="form.content"
        type="textarea"
        :rows="4"
        :autosize="{ minRows: 3, maxRows: 10 }"
        placeholder="记一句话、一个想法..."
        @keydown.enter.exact.prevent="handleSubmit"
      />

      <button class="more-toggle" type="button" @click="showMore = !showMore">
        {{ showMore ? '收起项目/分类' : '补充项目/分类（可选）' }}
      </button>

      <div v-if="showMore" class="form-row">
        <NSelect v-model:value="form.projectId" :options="projectOptions" clearable placeholder="项目" />
        <NSelect v-model:value="form.categoryId" :options="categoryOptions" clearable placeholder="分类" />
      </div>

      <div class="capture-hint">Enter 保存，Shift + Enter 换行</div>
    </div>

    <template #footer>
      <div class="modal-footer" :class="{ 'is-edit': !!note }">
        <NPopconfirm v-if="note" @positive-click="handleDelete">
          <template #trigger>
            <NButton quaternary type="error" size="small">删除随记</NButton>
          </template>
          确定删除这条随记吗？删除后不可恢复。
        </NPopconfirm>
        <div class="footer-right">
          <NButton @click="$emit('update:show', false)">取消</NButton>
          <NButton v-if="!note" quaternary type="primary" @click="handleSwitchToWorkLog">
            写成工作记录 →
          </NButton>
          <NButton type="primary" :loading="submitting" @click="handleSubmit">
            {{ note ? '保存修改' : '保存随记' }}
          </NButton>
        </div>
      </div>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { NModal, NInput, NSelect, NButton, NPopconfirm, useMessage, type InputInst, type SelectOption } from 'naive-ui'
import type { Note } from '@/types'
import { useNoteStore } from '@/stores/note'
import { useProjectStore } from '@/stores/project'
import { useCategoryStore } from '@/stores/category'

const props = defineProps<{
  show: boolean
  note?: Note | null
  initialContent?: string
  initialProjectId?: string | null
  initialCategoryId?: string | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  created: [note: Note]
  updated: [note: Note]
  deleted: [id: string]
  'switch-to-worklog': [payload: { content: string; projectId: string | null; categoryId: string | null }]
}>()

const message = useMessage()
const noteStore = useNoteStore()
const projectStore = useProjectStore()
const categoryStore = useCategoryStore()

const inputRef = ref<InputInst | null>(null)
const submitting = ref(false)
const showMore = ref(false)
const form = ref({
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

watch(
  () => props.show,
  async (visible) => {
    if (!visible) return
    if (props.note) {
      form.value = {
        content: props.note.content,
        projectId: props.note.projectId,
        categoryId: props.note.categoryId,
      }
      showMore.value = Boolean(props.note.projectId || props.note.categoryId)
    } else {
      form.value = {
        content: props.initialContent ?? '',
        projectId: props.initialProjectId ?? null,
        categoryId: props.initialCategoryId ?? null,
      }
      showMore.value = Boolean(props.initialProjectId || props.initialCategoryId)
    }
    await nextTick()
    inputRef.value?.focus()
  },
)

function resetForm() {
  form.value = { content: '', projectId: null, categoryId: null }
  showMore.value = false
}

async function handleDelete() {
  if (!props.note) return
  await noteStore.deleteNote(props.note.id)
  message.success('已删除')
  emit('deleted', props.note.id)
  emit('update:show', false)
}

async function handleSubmit() {
  const content = form.value.content.trim()
  if (!content) {
    message.warning('先写点什么吧')
    return
  }
  submitting.value = true
  try {
    if (props.note) {
      const updated = await noteStore.updateNote(props.note.id, {
        content,
        projectId: form.value.projectId,
        categoryId: form.value.categoryId,
      })
      message.success('随记已更新')
      emit('updated', updated)
    } else {
      const note = await noteStore.createNote({
        content,
        projectId: form.value.projectId,
        categoryId: form.value.categoryId,
      })
      message.success('已记录')
      emit('created', note)
    }
    emit('update:show', false)
  } catch {
    message.error('保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

function handleSwitchToWorkLog() {
  emit('switch-to-worklog', {
    content: form.value.content.trim(),
    projectId: form.value.projectId,
    categoryId: form.value.categoryId,
  })
  emit('update:show', false)
}
</script>

<style scoped>
.note-capture {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.more-toggle {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.more-toggle:hover {
  color: var(--color-primary-hover);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row > * {
  flex: 1;
}

.capture-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.modal-footer:not(.is-edit) {
  justify-content: flex-end;
}

.footer-right {
  display: flex;
  gap: 8px;
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
