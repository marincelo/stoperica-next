import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMetaStore } from '@/stores/meta'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
    /** Only for logged-out visitors (login, signup). */
    guestOnly?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/PublicLayout.vue'),
      children: [
        { path: '', name: 'races', component: () => import('@/views/public/RacesView.vue') },
        { path: 'live', name: 'live', component: () => import('@/views/public/LiveView.vue') },
        { path: 'utrke/:id(\\d+)', name: 'race', component: () => import('@/views/public/RaceView.vue') },
        { path: 'natjecatelji/:id(\\d+)', name: 'racer', component: () => import('@/views/public/RacerView.vue') },
        { path: 'klubovi/:id(\\d+)', name: 'club', component: () => import('@/views/public/ClubView.vue') },
        { path: 'natjecanja', name: 'leagues', component: () => import('@/views/public/LeaguesView.vue') },
        { path: 'natjecanja/:slug', name: 'league', component: () => import('@/views/public/LeagueView.vue') },
        { path: 'info', name: 'info', component: () => import('@/views/public/InfoView.vue') },
        { path: 'terms', name: 'terms', component: () => import('@/views/public/TermsView.vue') },
        { path: 'prijava', name: 'login', component: () => import('@/views/public/LoginView.vue'), meta: { guestOnly: true } },
        { path: 'registracija', name: 'signup', component: () => import('@/views/public/SignupView.vue'), meta: { guestOnly: true } },
        { path: 'profil', name: 'profile', component: () => import('@/views/public/ProfileView.vue'), meta: { requiresAuth: true } },
      ],
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', name: 'admin', component: () => import('@/views/admin/DashboardView.vue') },
        { path: ':resource', name: 'resource-list', component: () => import('@/views/admin/ResourceListView.vue') },
        { path: ':resource/new', name: 'resource-new', component: () => import('@/views/admin/ResourceFormView.vue') },
        { path: ':resource/:id', name: 'resource-show', component: () => import('@/views/admin/ResourceShowView.vue') },
        { path: ':resource/:id/edit', name: 'resource-edit', component: () => import('@/views/admin/ResourceFormView.vue') },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/layouts/PublicLayout.vue'),
      children: [{ path: '', name: 'not-found', component: () => import('@/views/NotFoundView.vue') }],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.ensureChecked()

  if (to.meta.guestOnly && auth.user) return { name: 'races' }
  if (to.meta.requiresAuth && !auth.user) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'not-found', params: { pathMatch: to.path.slice(1).split('/') } }

  if (to.meta.requiresAdmin) {
    const metaStore = useMetaStore()
    if (!metaStore.loaded) await metaStore.load()
    const resource = to.params.resource
    if (typeof resource === 'string' && !metaStore.byResource.has(resource)) {
      return { name: 'not-found', params: { pathMatch: to.path.slice(1).split('/') } }
    }
  }
  return true
})
