/**
 * 路由配置
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  // 兼容旧书签：收件箱已下线，旧链接统一回到工作台
  {
    path: '/inbox',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard/DashboardView.vue'),
    meta: { title: '工作台', icon: 'home' },
  },
  {
    path: '/daily-plan',
    name: 'DailyPlan',
    component: () => import('@/views/DailyPlan/DailyPlanView.vue'),
    meta: { title: '每日计划', icon: 'calendar' },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/views/Tasks/TasksView.vue'),
    meta: { title: '全部任务', icon: 'list' },
  },
  {
    path: '/work-logs',
    name: 'WorkLogs',
    component: () => import('@/views/WorkLog/WorkLogView.vue'),
    meta: { title: '工作日志', icon: 'document' },
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('@/views/Review/ReviewView.vue'),
    meta: { title: '工作复盘', icon: 'chart' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings/SettingsView.vue'),
    meta: { title: '设置', icon: 'settings' },
  },
  {
    path: '/data-management',
    name: 'DataManagement',
    component: () => import('@/views/DataManagement/DataManagementView.vue'),
    meta: { title: '数据管理', icon: 'database' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile/ProfileView.vue'),
    meta: { title: '个人信息', icon: 'user' },
  },
]

const router = createRouter({
  history: createWebHistory('/workflow/'),
  routes,
})

router.beforeEach((to, _from, next) => {
  const title = (to.meta?.title as string) ?? ''
  document.title = title ? `${title} - WorkFlow` : 'WorkFlow'
  next()
})

export default router
