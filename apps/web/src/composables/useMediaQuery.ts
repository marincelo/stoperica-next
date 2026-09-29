import { onScopeDispose, ref } from 'vue'

export function useMediaQuery(query: string) {
  const media = window.matchMedia(query)
  const matches = ref(media.matches)
  const onChange = (event: MediaQueryListEvent) => (matches.value = event.matches)
  media.addEventListener('change', onChange)
  onScopeDispose(() => media.removeEventListener('change', onChange))
  return matches
}
