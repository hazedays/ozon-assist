import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

/**
 * 路由配置模块
 * 处理所有页面路由跳转、布局嵌套以及全局导航守卫
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/auth',
      component: () => import('../layouts/blank.vue'),
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('../views/auth/login/index.vue'),
          meta: { requiresAuth: false }
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('../views/auth/register/index.vue'),
          meta: { requiresAuth: false }
        }
      ]
    },
    {
      path: '/',
      redirect: '/auth/login'
    },
    // 独立层级的法律与支持路径 (用于原子级窗口渲染，不嵌套在侧边栏)
    {
      path: '/legal',
      meta: { requiresAuth: false },
      children: [
        {
          path: 'terms',
          name: 'terms',
          component: () => import('../views/legal/terms.vue')
        },
        {
          path: 'privacy',
          name: 'privacy',
          component: () => import('../views/legal/privacy.vue')
        },
        {
          path: 'support',
          name: 'support',
          component: () => import('../views/legal/support.vue')
        }
      ]
    },
    {
      path: '/',
      component: () => import('../layouts/default.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'complaints',
          component: () => import('../views/complaints/index.vue')
        },
        {
          path: 'images',
          name: 'images',
          component: () => import('../views/images/index.vue')
        },
        {
          path: 'help',
          name: 'help',
          component: () => import('../views/help/index.vue')
        }
      ]
    },
    // 将所有未匹配路由重定向到首页
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

/**
 * 全局导航守卫
 */
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false

  // 检查是否有本地存储的认证状态
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'

  if (requiresAuth && !isAuthenticated) {
    // 1. 需要认证但未登录，跳转到登录页
    next({ name: 'login' })
  } else if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    // 2. 已登录但试图访问登录或注册页，跳转到首页
    next({ name: 'complaints' })
  } else {
    // 3. 验证会话有效性 (如果已认证但内存中无用户，则请求后端)
    if (isAuthenticated && !authStore.user) {
      try {
        await authStore.checkSession()
      } catch {
        // 会话过期或无效，清理状态并重定向
        localStorage.removeItem('isAuthenticated')
        if (requiresAuth) {
          next({ name: 'login' })
          return
        }
      }
    }
    next()
  }
})

export default router
