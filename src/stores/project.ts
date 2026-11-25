/**
 * 项目状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useServices } from '@/services'
import type { Project } from '@/types'

export const useProjectStore = defineStore('project', () => {
  const services = useServices()

  const projects = ref<Project[]>([])
  const loading = ref(false)

  const activeProjects = computed(() => projects.value.filter((p) => p.status === 'active'))
  const projectMap = computed(() => {
    const map: Record<string, Project> = {}
    for (const p of projects.value) {
      map[p.id] = p
    }
    return map
  })

  async function loadAll() {
    loading.value = true
    try {
      projects.value = await services.project.getAllProjects()
    } finally {
      loading.value = false
    }
  }

  async function createProject(input: { name: string; description?: string; color?: string }): Promise<Project> {
    const project = await services.project.createProject(input)
    projects.value.push(project)
    return project
  }

  async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
    const updated = await services.project.updateProject(id, patch)
    const index = projects.value.findIndex((p) => p.id === id)
    if (index >= 0) projects.value[index] = updated
    return updated
  }

  async function deleteProject(id: string): Promise<void> {
    await services.project.deleteProject(id)
    const index = projects.value.findIndex((p) => p.id === id)
    if (index >= 0) projects.value.splice(index, 1)
  }

  function getProjectName(id: string | null): string {
    if (!id) return ''
    return projectMap.value[id]?.name ?? ''
  }

  function getProjectColor(id: string | null): string {
    if (!id) return ''
    return projectMap.value[id]?.color ?? '#64748B'
  }

  return {
    projects,
    loading,
    activeProjects,
    projectMap,
    loadAll,
    createProject,
    updateProject,
    deleteProject,
    getProjectName,
    getProjectColor,
  }
})
