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
    }
  ]
})

export default router
