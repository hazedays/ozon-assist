import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'complaints',
      component: () => import('../views/complaints/index.vue')
    },
    {
      path: '/images',
      name: 'images',
      component: () => import('../views/images/index.vue')
    },
    {
      path: '/help',
      name: 'help',
      component: () => import('../views/help/index.vue')
    },
    {
      path: '/settings/runtime',
      name: 'runtime-settings',
      component: () => import('../views/settings/runtime.vue')
    },
    {
      path: '/settings/logs',
      name: 'runtime-logs',
      component: () => import('../views/settings/logs.vue')
    }
  ]
})

export default router
