<template>
  <div class="profile-view">
    <div class="page-header">
      <h2 class="page-title">个人信息</h2>
    </div>

    <div class="profile-section">
      <div class="profile-avatar">
        <div class="avatar-circle">U</div>
      </div>
      <div class="profile-info">
        <div class="info-row">
          <span class="info-label">用户名</span>
          <span class="info-value">默认用户</span>
        </div>
        <div class="info-row">
          <span class="info-label">用户 ID</span>
          <span class="info-value mono">{{ userId }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">角色</span>
          <span class="info-value">个人用户 (V1.0)</span>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <h3 class="section-title">使用统计</h3>
      <div class="usage-stats">
        <div class="usage-item">
          <div class="usage-num">{{ usageStats.totalTasks }}</div>
          <div class="usage-label">总任务</div>
        </div>
        <div class="usage-item">
          <div class="usage-num">{{ usageStats.completedTasks }}</div>
          <div class="usage-label">已完成</div>
        </div>
        <div class="usage-item">
          <div class="usage-num">{{ usageStats.totalLogs }}</div>
          <div class="usage-label">工作日志</div>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <h3 class="section-title">关于 WorkFlow</h3>
      <div class="about-info">
        <div class="info-row">
          <span class="info-label">版本</span>
          <span class="info-value">V1.0.0</span>
        </div>
        <div class="info-row">
          <span class="info-label">产品类型</span>
          <span class="info-value">通用型个人工作管理系统</span>
        </div>
        <div class="info-row">
          <span class="info-label">存储方式</span>
          <span class="info-value">本地 IndexedDB（离线可用）</span>
        </div>
        <div class="info-row">
          <span class="info-label">技术栈</span>
          <span class="info-value">Vue 3 · TypeScript · Vite · Naive UI</span>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <h3 class="section-title">核心理念</h3>
      <div class="philosophy">
        <p class="philosophy-text">让工作有计划，让过程有记录，让成果有沉淀。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useServices } from '@/services'
import { CURRENT_USER_ID } from '@/db/database'

const services = useServices()
const userId = CURRENT_USER_ID

const usageStats = ref({ totalTasks: 0, completedTasks: 0, totalLogs: 0 })

onMounted(async () => {
  const overview = await services.statistics.getOverview()
  usageStats.value = {
    totalTasks: overview.totalTasks,
    completedTasks: overview.completedTasks,
    totalLogs: overview.workLogCount,
  }
})
</script>

<style scoped>
.profile-view {
  width: 100%;
  padding: 32px 40px 64px;
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
}

.profile-section {
  background-color: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.profile-avatar {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.avatar-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.info-value {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
}

.info-value.mono {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 16px;
}

.usage-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.usage-item {
  text-align: center;
  padding: 16px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.usage-num {
  font-size: 24px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.usage-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.about-info {
  display: flex;
  flex-direction: column;
}

.philosophy {
  text-align: center;
  padding: 20px;
}

.philosophy-text {
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  letter-spacing: 2px;
}

@media (max-width: 768px) {
  .profile-view {
    padding: 20px 14px 48px;
  }
}
</style>
