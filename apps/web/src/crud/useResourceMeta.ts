import type { ModelMeta } from '@stoperica/shared'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMetaStore } from '@/stores/meta'

/** Meta of the resource in the current route. The router guard guarantees it exists. */
export function useResourceMeta() {
  const route = useRoute()
  const metaStore = useMetaStore()
  const resource = computed(() => String(route.params.resource))
  const meta = computed(() => metaStore.byResource.get(resource.value) as ModelMeta)
  return { resource, meta }
}
