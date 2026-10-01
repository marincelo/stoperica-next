<script setup lang="ts">
import type { LeagueRace, StandingValues } from '@stoperica/shared'
import { useThemeVars } from 'naive-ui'
import { computed, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'
import TrophyIcon from '@/components/public/TrophyIcon.vue'

export interface StandingRowView extends StandingValues {
  key: string | number
  title: string
  subtitle?: string | null
  subtitleTo?: RouteLocationRaw
  flag?: string
  flagTitle?: string
  mine?: boolean
  to?: RouteLocationRaw
}

const props = defineProps<{
  rows: StandingRowView[]
  races: LeagueRace[]
  mode: 'points' | 'time'
  nameLabel: string
}>()

const themeVars = useThemeVars()
const expanded = ref(new Set<string | number>())

function toggle(key: string | number) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

const roundWidth = computed(() => (props.mode === 'time' ? '68px' : '46px'))
const totalWidth = computed(() => (props.mode === 'time' ? '92px' : '84px'))
const gapWidth = computed(() => (props.mode === 'time' ? '116px' : '112px'))

const style = computed(() => ({
  '--primary': themeVars.value.primaryColor,
  '--muted': themeVars.value.textColor3,
  '--divider': themeVars.value.dividerColor,
  '--surface': themeVars.value.cardColor,
  '--chip': themeVars.value.actionColor,
  '--wide-cols': `44px minmax(200px, 1fr) repeat(${props.races.length}, ${roundWidth.value}) ${totalWidth.value} ${gapWidth.value}`,
}))

const medal = (place: number) => (place >= 1 && place <= 3 ? (place as 1 | 2 | 3) : null)
const roundPlaceholder = (race: LeagueRace) => (race.status === 'finished' ? '—' : '·')
</script>

<template>
  <div class="standings" :style="style">
    <div class="scroller">
      <div class="grid">
        <div class="row head" aria-hidden="true">
          <span class="c-place">#</span>
          <span class="c-name">{{ nameLabel }}</span>
          <span v-for="race in races" :key="race.id" class="c-round" :title="race.name ?? ''">R{{ race.round }}</span>
          <span class="c-total">Ukupno</span>
          <span class="c-gap">Zaostatak</span>
        </div>

        <div
          v-for="row in rows"
          :key="row.key"
          class="row"
          :class="{ mine: row.mine, open: expanded.has(row.key), podium: row.place <= 3 }"
        >
          <div
            class="row-main"
            role="button"
            :aria-expanded="expanded.has(row.key)"
            tabindex="0"
            @click="toggle(row.key)"
            @keydown.enter.prevent="toggle(row.key)"
            @keydown.space.prevent="toggle(row.key)"
          >
            <span class="c-place">
              <span class="place">{{ row.place }}</span>
              <TrophyIcon v-if="medal(row.place)" :place="medal(row.place)!" />
            </span>
            <span class="c-name">
              <span class="title">
                <span v-if="row.flag" class="flag" :title="row.flagTitle">{{ row.flag }}</span>
                <RouterLink v-if="row.to" :to="row.to" class="title-text" @click.stop>{{ row.title }}</RouterLink>
                <span v-else class="title-text">{{ row.title }}</span>
              </span>
              <RouterLink v-if="row.subtitleTo && row.subtitle" :to="row.subtitleTo" class="subtitle" @click.stop>
                {{ row.subtitle }}
              </RouterLink>
              <span v-else-if="row.subtitle" class="subtitle">{{ row.subtitle }}</span>
            </span>
            <span
              v-for="(value, i) in row.rounds"
              :key="races[i]?.id ?? i"
              class="c-round wide-only"
              :class="{ empty: value === null }"
              :title="races[i]?.name ?? ''"
            >
              {{ value ?? roundPlaceholder(races[i]!) }}
            </span>
            <span class="c-total">{{ row.total }}</span>
            <span class="c-gap">{{ row.gap ?? '' }}</span>
            <span class="chevron narrow-only" aria-hidden="true">▾</span>
          </div>

          <ol v-if="expanded.has(row.key)" class="rounds narrow-only">
            <li v-for="(value, i) in row.rounds" :key="races[i]?.id ?? i" :class="{ empty: value === null }">
              <span class="round-label">R{{ races[i]?.round }}</span>
              <span class="round-value">{{ value ?? roundPlaceholder(races[i]!) }}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.standings {
  border: 1px solid var(--divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
  font-variant-numeric: tabular-nums;
}
.row {
  border-top: 1px solid var(--divider);
}
.row.head {
  display: none;
}
.row.mine {
  background: color-mix(in srgb, var(--aqua) 12%, transparent);
  box-shadow: inset 3px 0 0 var(--aqua);
}
.row-main {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  cursor: pointer;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto 18px;
  grid-template-areas: 'place name total chevron' 'place name gap chevron';
  column-gap: 10px;
  align-items: center;
  padding: 10px 12px;
}
.row-main:focus-visible {
  outline: 2px solid var(--aqua);
  outline-offset: -2px;
}
.c-place {
  grid-area: place;
  display: flex;
  align-items: center;
  gap: 3px;
}
.place {
  font-weight: 700;
  font-size: 16px;
}
.c-name {
  grid-area: name;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  min-width: 0;
}
.title-text,
.subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.title-text {
  color: inherit;
  text-decoration: none;
}
a.title-text {
  cursor: pointer;
}
a.title-text:hover {
  color: var(--primary);
}
a.subtitle {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}
a.subtitle:hover {
  color: var(--primary);
}
.subtitle {
  font-size: 12px;
  color: var(--muted);
}
.c-total {
  grid-area: total;
  justify-self: end;
  font-weight: 700;
  font-size: 16px;
}
.c-gap {
  grid-area: gap;
  justify-self: end;
  font-size: 12px;
  color: var(--muted);
}
.chevron {
  grid-area: chevron;
  color: var(--muted);
  transition: transform 0.15s;
}
.row.open .chevron {
  transform: rotate(180deg);
}
.wide-only,
.row.head {
  display: none;
}

.rounds {
  list-style: none;
  margin: 0;
  padding: 0 12px 12px 62px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
  gap: 6px;
}
.rounds li {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--chip);
}
.rounds li.empty {
  opacity: 0.5;
}
.round-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}
.round-value {
  font-size: 13px;
  font-weight: 600;
}

@media (min-width: 900px) {
  .scroller {
    overflow-x: auto;
  }
  .grid {
    min-width: max-content;
  }
  .row.head,
  .row-main {
    display: grid;
    grid-template-columns: var(--wide-cols);
    grid-template-areas: none;
    column-gap: 0;
    padding: 0;
    cursor: default;
  }
  .row.head {
    border-top: 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .row.head > span,
  .row-main > span {
    padding: 9px 8px;
  }
  .c-place,
  .c-name,
  .c-total,
  .c-gap {
    grid-area: auto;
  }
  .c-place,
  .c-name {
    position: sticky;
    background: var(--surface);
    z-index: 1;
  }
  .c-place {
    left: 0;
    padding-left: 14px !important;
  }
  .c-name {
    left: 44px;
    flex-direction: row;
    align-items: baseline;
    gap: 10px;
  }
  .row.mine .c-place,
  .row.mine .c-name {
    background: color-mix(in srgb, var(--aqua) 12%, var(--surface));
  }
  .row.head .c-place,
  .row.head .c-name {
    background: var(--surface);
  }
  .subtitle {
    font-size: 13px;
  }
  .wide-only {
    display: block;
  }
  .c-round {
    text-align: center;
    font-size: 13px;
  }
  .c-round.empty {
    color: var(--muted);
  }
  .c-total,
  .c-gap {
    justify-self: stretch;
    text-align: right;
  }
  .c-total {
    font-size: 14px;
  }
  .c-gap {
    padding-right: 14px !important;
    font-size: 13px;
  }
  .narrow-only {
    display: none;
  }
  .place {
    font-size: 14px;
  }
}
</style>
