<script setup lang="ts">
import type { PublicRaceSummary } from '@stoperica/shared'
import { NButton, NCard, NText } from 'naive-ui'
import { RouterLink, useRouter } from 'vue-router'
import { formatDate, RACE_TYPE_LABELS } from '@/public/format'

const props = defineProps<{ race: PublicRaceSummary }>()
const router = useRouter()
const to = { name: 'race', params: { id: props.race.id } }
</script>

<template>
  <NCard size="small" class="race-row" content-style="padding: 10px">
    <div class="row">
      <RouterLink :to="to" class="thumb">
        <img v-if="race.pictureUrl" :src="race.pictureUrl" :alt="race.name ?? ''" loading="lazy" />
        <span v-else>⏱</span>
      </RouterLink>
      <div class="info">
        <RouterLink :to="to" class="name">{{ race.name }}</RouterLink>
        <NText depth="3" class="meta">
          {{ formatDate(race.date) }}
          <template v-if="race.raceType"> · {{ RACE_TYPE_LABELS[race.raceType] }}</template>
          <template v-if="race.league"> · {{ race.league.name }}</template>
        </NText>
        <NText depth="3" class="meta">Natjecatelja: {{ race.registeredCount }}</NText>
      </div>
      <NButton class="action" type="info" size="small" @click="router.push(to)">Rezultati</NButton>
    </div>
  </NCard>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  grid-template-areas: 'thumb info' 'thumb action';
  column-gap: 12px;
  row-gap: 6px;
  align-items: center;
}
.thumb {
  grid-area: thumb;
  align-self: start;
  width: 72px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 26px;
  background: rgba(128, 128, 128, 0.15);
  text-decoration: none;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.info {
  grid-area: info;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.name {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.3;
  color: inherit;
  text-decoration: none;
}
.meta {
  font-size: 13px;
}
.action {
  grid-area: action;
  justify-self: start;
}

@media (min-width: 640px) {
  .row {
    grid-template-columns: 128px minmax(0, 1fr) auto;
    grid-template-areas: 'thumb info action';
    column-gap: 16px;
  }
  .thumb {
    width: 128px;
    height: 72px;
    align-self: center;
  }
  .name {
    font-size: 16px;
  }
}
</style>
