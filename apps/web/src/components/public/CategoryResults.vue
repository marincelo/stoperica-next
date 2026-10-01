<script setup lang="ts">
import type { PublicCategory, PublicResult, RaceStartNumberOption, RaceType } from '@stoperica/shared'
import { NTag, useThemeVars } from 'naive-ui'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BibAssign from '@/components/public/BibAssign.vue'
import ClubLink from '@/components/public/ClubLink.vue'
import TrophyIcon from '@/components/public/TrophyIcon.vue'
import { cleanTime, countryFlag, countryName, racerName, statusLabel, statusType, uciRacerName } from '@/public/format'

const props = defineProps<{
  category: PublicCategory
  raceType: RaceType | null
  started: boolean
  uciDisplay: boolean
  myRacerId: number | null
  assignable?: boolean
  startNumbers?: RaceStartNumberOption[]
  savingResultId?: number | null
}>()

const emit = defineEmits<{ assign: [resultId: number, startNumberId: number | null] }>()

const open = ref(true)
const themeVars = useThemeVars()

const hasPoints = computed(() => props.category.results.some((r) => r.points !== null))
const splitWord = computed(() => (props.raceType === 'xco' ? 'krug' : 'dionica'))

type Column = { area: string; label: string; width: string; align?: 'end' }

/** Desktop columns; on phones the same cells are regrouped into a compact two-line card via CSS. */
const columns = computed(() => {
  const cols: Column[] = []
  if (props.started) cols.push({ area: 'pos', label: 'Poz.', width: '52px' })
  cols.push({ area: 'bib', label: 'Broj', width: props.assignable ? '156px' : '56px' })
  cols.push({ area: 'name', label: 'Natjecatelj', width: 'minmax(0, 2fr)' })
  cols.push({ area: 'club', label: 'Klub', width: 'minmax(0, 1.5fr)' })
  if (props.uciDisplay) cols.push({ area: 'uci', label: 'UCI ID', width: '112px' })
  cols.push({ area: 'status', label: 'Status', width: '104px' })
  if (props.started) {
    cols.push({ area: 'time', label: 'Vrijeme', width: '84px', align: 'end' })
    cols.push({ area: 'delta', label: 'Zaostatak', width: '88px', align: 'end' })
  }
  if (hasPoints.value) cols.push({ area: 'pts', label: 'Bodovi', width: '60px', align: 'end' })
  return cols
})

const gridStyle = computed(() => {
  const cols = columns.value
  const lead = props.started ? 2 : 1
  const splitsRow = cols.map((c, i) => (i < lead ? '.' : 'splits')).join(' ')
  return {
    '--cols-wide': cols.map((c) => c.width).join(' '),
    '--areas-wide': `"${cols.map((c) => c.area).join(' ')}" "${splitsRow}"`,
    '--cols-narrow': props.started ? '36px minmax(0, 1fr) auto' : 'minmax(0, 1fr)',
    '--areas-narrow': props.started ? '"pos who timing" "pos meta timing" "splits splits splits"' : '"who" "meta"',
  }
})

const themeStyle = computed(() => ({
  '--divider': themeVars.value.dividerColor,
  '--primary': themeVars.value.primaryColor,
  '--muted': themeVars.value.textColor3,
  '--surface': themeVars.value.cardColor,
  '--chip': themeVars.value.actionColor,
}))

const medal = (r: PublicResult) =>
  props.started && r.status === 3 && r.position !== null && r.position >= 1 && r.position <= 3
    ? (r.position as 1 | 2 | 3)
    : null

const displayName = (r: PublicResult) => (props.uciDisplay ? uciRacerName(r.racer) : racerName(r.racer))
const trackKm = computed(() =>
  props.category.trackLength ? `${(props.category.trackLength / 1000).toLocaleString('hr-HR')} km` : null,
)
</script>

<template>
  <section class="category" :style="themeStyle">
    <button type="button" class="category-header" :aria-expanded="open" @click="open = !open">
      <span class="category-name">{{ category.name }}</span>
      <span class="category-meta">
        {{ category.results.length }}
        <template v-if="trackKm"> · {{ trackKm }}</template>
      </span>
      <span class="chevron" :class="{ closed: !open }">▾</span>
    </button>

    <div v-show="open" class="results" :style="gridStyle">
      <div class="result head" aria-hidden="true">
        <span v-for="col in columns" :key="col.area" :style="{ gridArea: col.area }" :class="{ end: col.align === 'end' }">
          {{ col.label }}
        </span>
      </div>

      <article v-for="r in category.results" :key="r.id" class="result" :class="{ mine: r.racer.id === myRacerId }">
        <div v-if="started" class="r-pos">
          <span class="pos-number">{{ r.position ?? '' }}</span>
          <TrophyIcon v-if="medal(r)" :place="medal(r)!" />
        </div>

        <div class="r-who">
          <div class="r-name">
            <span v-if="r.racer.country" class="flag" :title="countryName(r.racer.country)">{{ countryFlag(r.racer.country) }}</span>
            <RouterLink :to="{ name: 'racer', params: { id: r.racer.id } }" class="name-text">{{ displayName(r) }}</RouterLink>
          </div>
          <ClubLink class="r-club" :name="r.racer.club" :club-id="r.racer.clubId" />
        </div>

        <div class="r-meta">
          <span class="r-bib">
            <BibAssign
              v-if="assignable"
              :model-value="r.startNumberId"
              :options="startNumbers ?? []"
              :loading="savingResultId === r.id"
              @update="emit('assign', r.id, $event)"
            />
            <template v-else-if="r.startNumber"><span class="narrow-only">#</span>{{ r.startNumber }}</template>
          </span>
          <span v-if="uciDisplay" class="r-uci">
            <template v-if="r.racer.uciId"><span class="narrow-only">UCI </span>{{ r.racer.uciId }}</template>
          </span>
          <span class="r-status">
            <NTag size="tiny" :bordered="false" :type="statusType(r.status)">{{ statusLabel(r) }}</NTag>
          </span>
          <span v-if="hasPoints" class="r-pts">
            <template v-if="r.points !== null">{{ r.points }}<span class="narrow-only"> bod.</span></template>
          </span>
        </div>

        <div v-if="started" class="r-timing">
          <span class="r-time">{{ r.status === 3 ? cleanTime(r.finishTime) : '' }}</span>
          <span class="r-delta">{{ r.status === 3 && r.position !== 1 ? cleanTime(r.finishDelta) : '' }}</span>
        </div>

        <ol v-if="r.splits.length" class="r-splits">
          <li v-for="split in r.splits" :key="split.label" class="split" :class="{ missed: split.missed }">
            <span class="split-label">{{ split.label }}</span>
            <span class="split-time">{{ split.time ?? '—' }}</span>
            <span v-if="split.split" class="split-diff">{{ splitWord }} {{ split.split }}</span>
          </li>
        </ol>
      </article>
    </div>
  </section>
</template>

<style scoped>
.category {
  border: 1px solid var(--divider);
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface);
}
.category-header {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  background: color-mix(in srgb, var(--aqua) 14%, transparent);
  border-left: 4px solid var(--aqua);
}
.category-header:focus-visible {
  outline: 2px solid var(--aqua);
  outline-offset: -2px;
}
.category-name {
  font-weight: 700;
  font-size: 15px;
  flex: 1;
  min-width: 0;
}
.category-meta {
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}
.chevron {
  transition: transform 0.15s;
}
.chevron.closed {
  transform: rotate(-90deg);
}

.result {
  display: grid;
  grid-template-columns: var(--cols-narrow);
  grid-template-areas: var(--areas-narrow);
  column-gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-top: 1px solid var(--divider);
  font-variant-numeric: tabular-nums;
}
.result.head {
  display: none;
}
.result.mine {
  background: color-mix(in srgb, var(--aqua) 12%, transparent);
  box-shadow: inset 3px 0 0 var(--aqua);
}

.r-pos {
  grid-area: pos;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.pos-number {
  font-weight: 700;
  font-size: 17px;
}
.r-who {
  grid-area: who;
  min-width: 0;
}
.r-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  min-width: 0;
}
.name-text,
.r-club {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.name-text {
  color: inherit;
  text-decoration: none;
}
.name-text:hover,
.r-club:hover {
  color: var(--primary);
}
.r-club {
  font-size: 13px;
  color: var(--muted);
  text-decoration: none;
}
.r-meta {
  grid-area: meta;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
.r-meta > span:empty {
  display: none;
}
.r-timing {
  grid-area: timing;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.r-time {
  font-weight: 700;
  font-size: 15px;
}
.r-delta {
  font-size: 12px;
  color: var(--muted);
}

.r-splits {
  grid-area: splits;
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 6px;
}
.split {
  display: flex;
  flex-direction: column;
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--chip);
  line-height: 1.3;
}
.split.missed {
  opacity: 0.45;
}
.split-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.split-time {
  font-weight: 600;
  font-size: 13px;
}
.split-diff {
  font-size: 11px;
  color: var(--muted);
}

@media (min-width: 900px) {
  .result {
    grid-template-columns: var(--cols-wide);
    grid-template-areas: var(--areas-wide);
    padding: 8px 14px;
  }
  .result.head {
    display: grid;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
  }
  .head .end {
    text-align: right;
  }
  .r-who,
  .r-meta,
  .r-timing {
    display: contents;
  }
  .r-pos {
    flex-direction: row;
    justify-content: flex-start;
    gap: 4px;
  }
  .pos-number {
    font-size: 15px;
  }
  .r-name {
    grid-area: name;
  }
  .r-club {
    grid-area: club;
    font-size: 14px;
  }
  .r-bib {
    grid-area: bib;
  }
  .r-uci {
    grid-area: uci;
  }
  .r-status {
    grid-area: status;
  }
  .r-pts {
    grid-area: pts;
    text-align: right;
  }
  .r-meta > span,
  .r-meta > span:empty {
    display: block;
    font-size: 14px;
    color: inherit;
  }
  .r-bib,
  .r-uci {
    color: var(--muted) !important;
  }
  .r-time {
    grid-area: time;
    text-align: right;
    font-size: 14px;
  }
  .r-delta {
    grid-area: delta;
    text-align: right;
    font-size: 13px;
  }
  .narrow-only {
    display: none;
  }
  .r-splits {
    margin-top: 6px;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  }
}
</style>
