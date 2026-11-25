/**
 * 应用入口
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/global.css'
import { initDatabase } from './db/seed'
import { RecurrenceService } from './services/recurrence.service'

async function bootstrap() {
  // 初始化数据库（默认分类、项目、设置）
  await initDatabase()

  // 生成今天的周期任务
  const recurrenceService = new RecurrenceService()
  await recurrenceService.generateTodayTasks()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()
