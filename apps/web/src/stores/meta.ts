import type { ModelMeta } from '@stoperica/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { http } from '@/api/http'

export const useMetaStore = defineStore('meta', () => {
  const models = ref<ModelMeta[]>([])
  const loaded = ref(false)
  let pending: Promise<void> | null = null

  const byResource = computed(() => new Map(models.value.map((m) => [m.resource, m])))
  const byModel = computed(() => new Map(models.value.map((m) => [m.name, m])))

  function load() {
    pending ??= http
      .get<ModelMeta[]>('/admin/meta')
      .then((data) => {
        models.value = data
        loaded.value = true
      })
      .finally(() => {
        pending = null
      })
    return pending
  }

  function reset() {
    models.value = []
    loaded.value = false
  }

  return { models, loaded, byResource, byModel, load, reset }
})
