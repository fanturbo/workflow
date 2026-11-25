/**
 * 随记状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useServices } from '@/services'
import { todayLocal } from '@/utils/date'
import type { Note } from '@/types'

function sortByCreatedDesc(list: Note[]): Note[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const useNoteStore = defineStore('note', () => {
  const services = useServices()

  const notes = ref<Note[]>([])
  const todayNotes = ref<Note[]>([])
  const loading = ref(false)
  const captureModalVisible = ref(false)

  const noteCount = computed(() => notes.value.length)

  /** 加载所有随记 */
  async function loadAll() {
    loading.value = true
    try {
      notes.value = sortByCreatedDesc(await services.note.getAllNotes())
    } finally {
      loading.value = false
    }
  }

  /** 加载今日随记 */
  async function loadToday() {
    todayNotes.value = sortByCreatedDesc(await services.note.getByDate(todayLocal()))
  }

  /** 创建随记 */
  async function createNote(input: {
    content: string
    projectId?: string | null
    categoryId?: string | null
  }): Promise<Note> {
    const note = await services.note.createNote(input)
    notes.value.unshift(note)
    // 新创建的随记一定属于今天
    todayNotes.value.unshift(note)
    return note
  }

  /** 更新随记 */
  async function updateNote(id: string, patch: Partial<Note>): Promise<Note> {
    const updated = await services.note.updateNote(id, patch)
    const index = notes.value.findIndex((n) => n.id === id)
    if (index >= 0) notes.value[index] = updated
    const todayIndex = todayNotes.value.findIndex((n) => n.id === id)
    if (todayIndex >= 0) todayNotes.value[todayIndex] = updated
    return updated
  }

  /** 删除随记 */
  async function deleteNote(id: string): Promise<void> {
    await services.note.deleteNote(id)
    notes.value = notes.value.filter((n) => n.id !== id)
    todayNotes.value = todayNotes.value.filter((n) => n.id !== id)
  }

  /** 搜索随记 */
  async function search(keyword: string): Promise<Note[]> {
    return services.note.search(keyword)
  }

  /** 转为待办任务 */
  async function convertToTask(id: string): Promise<Note> {
    const { note } = await services.note.convertToTask(id)
    const index = notes.value.findIndex((n) => n.id === id)
    if (index >= 0) notes.value[index] = note
    const todayIndex = todayNotes.value.findIndex((n) => n.id === id)
    if (todayIndex >= 0) todayNotes.value[todayIndex] = note
    return note
  }

  /** 标记已补全为工作记录 */
  async function markConvertedWorkLog(id: string, workLogId: string): Promise<Note> {
    const note = await services.note.markConvertedWorkLog(id, workLogId)
    const index = notes.value.findIndex((n) => n.id === id)
    if (index >= 0) notes.value[index] = note
    const todayIndex = todayNotes.value.findIndex((n) => n.id === id)
    if (todayIndex >= 0) todayNotes.value[todayIndex] = note
    return note
  }

  return {
    notes,
    todayNotes,
    loading,
    captureModalVisible,
    noteCount,
    loadAll,
    loadToday,
    createNote,
    updateNote,
    deleteNote,
    search,
    convertToTask,
    markConvertedWorkLog,
  }
})
