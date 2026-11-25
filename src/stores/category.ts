/**
 * 分类状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useServices } from '@/services'
import type { Category } from '@/types'

export const useCategoryStore = defineStore('category', () => {
  const services = useServices()

  const categories = ref<Category[]>([])
  const loading = ref(false)

  const categoryMap = computed(() => {
    const map: Record<string, Category> = {}
    for (const c of categories.value) {
      map[c.id] = c
    }
    return map
  })

  async function loadAll() {
    loading.value = true
    try {
      categories.value = await services.category.getAllCategories()
    } finally {
      loading.value = false
    }
  }

  async function createCategory(input: { name: string; color?: string; icon?: string }): Promise<Category> {
    const category = await services.category.createCategory(input)
    categories.value.push(category)
    return category
  }

  async function updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
    const updated = await services.category.updateCategory(id, patch)
    const index = categories.value.findIndex((c) => c.id === id)
    if (index >= 0) categories.value[index] = updated
    return updated
  }

  async function deleteCategory(id: string): Promise<void> {
    await services.category.deleteCategory(id)
    const index = categories.value.findIndex((c) => c.id === id)
    if (index >= 0) categories.value.splice(index, 1)
  }

  function getCategoryName(id: string | null): string {
    if (!id) return ''
    return categoryMap.value[id]?.name ?? ''
  }

  function getCategoryColor(id: string | null): string {
    if (!id) return ''
    return categoryMap.value[id]?.color ?? '#64748B'
  }

  return {
    categories,
    loading,
    categoryMap,
    loadAll,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryName,
    getCategoryColor,
  }
})
