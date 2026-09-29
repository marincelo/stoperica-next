<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useNavItems } from '@/composables/useNavItems'

const { items, isActive } = useNavItems()
</script>

<template>
  <nav class="tab-bar" aria-label="Glavna navigacija">
    <RouterLink
      v-for="item in items"
      :key="item.key"
      :to="item.to"
      class="tab"
      :class="{ active: isActive(item) }"
      :aria-current="isActive(item) ? 'page' : undefined"
    >
      <span class="pill">
        <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path :d="item.icon" /></svg>
      </span>
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-bar {
  --ink: #1a0d00;
  position: fixed;
  inset: auto 0 0 0;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding-bottom: env(safe-area-inset-bottom);
  background: linear-gradient(100deg, var(--gold-1) 0%, var(--gold) 55%, var(--gold-2) 100%);
  box-shadow:
    inset 0 -1px 0 rgba(0, 0, 0, 0.12),
    0 -6px 20px -10px rgba(255, 138, 31, 0.8);
}
.tab-bar::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--aqua) 20%, var(--aqua-deep) 80%, transparent);
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 7px 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink);
  opacity: 0.72;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.tab.active {
  opacity: 1;
  font-weight: 700;
}
.pill {
  display: grid;
  place-items: center;
  width: 52px;
  height: 28px;
  border-radius: 999px;
  transition: background-color 0.15s;
}
.tab.active .pill {
  color: var(--gold-1);
  background: var(--ink);
  box-shadow: 0 2px 8px -2px rgba(26, 13, 0, 0.5);
}
.icon {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

@media (min-width: 768px) {
  .tab-bar {
    display: none;
  }
}
</style>
