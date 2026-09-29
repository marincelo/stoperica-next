<script setup lang="ts">
import type { PublicRaceSummary } from '@stoperica/shared'
import { NButton, NCard, NFlex, NTag, NText } from 'naive-ui'
import { RouterLink, useRouter } from 'vue-router'
import { formatDateTime, RACE_TYPE_LABELS } from '@/public/format'

const props = defineProps<{ race: PublicRaceSummary }>()
const router = useRouter()
const to = { name: 'race', params: { id: props.race.id } }
</script>

<template>
  <NCard class="race-card" content-style="padding: 14px 16px 16px; display: flex; flex-direction: column">
    <template #cover>
      <RouterLink :to="to" class="cover" draggable="false">
        <img v-if="race.pictureUrl" :src="race.pictureUrl" :alt="race.name ?? ''" loading="lazy" draggable="false" />
        <div v-else class="cover-placeholder">⏱</div>
      </RouterLink>
    </template>
    <NFlex vertical :size="6" class="body">
      <NFlex :size="6">
        <NTag v-if="race.raceType" size="small" :bordered="false">{{ RACE_TYPE_LABELS[race.raceType] }}</NTag>
        <NTag v-if="race.registrationOpen" size="small" type="primary" :bordered="false">Prijave otvorene</NTag>
      </NFlex>
      <RouterLink :to="to" class="name" draggable="false">{{ race.name }}</RouterLink>
      <NText depth="2">{{ formatDateTime(race.date) }}</NText>
      <NText v-if="race.league" depth="3" class="small">{{ race.league.name }}</NText>
      <NText depth="3" class="small">Prijavljenih: {{ race.registeredCount }}</NText>
    </NFlex>
    <NButton block :type="race.registrationOpen ? 'primary' : 'info'" class="action" @click="router.push(to)">
      {{ race.registrationOpen ? 'Pogledaj i prijavi se' : 'Pogledaj utrku' }}
    </NButton>
  </NCard>
</template>

<style scoped>
.race-card {
  height: 100%;
}
.cover {
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: rgba(128, 128, 128, 0.15);
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-placeholder {
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 42px;
  opacity: 0.4;
}
.body {
  flex: 1;
}
.name {
  font-weight: 600;
  font-size: 17px;
  line-height: 1.3;
  color: inherit;
  text-decoration: none;
}
.small {
  font-size: 13px;
}
.action {
  margin-top: 14px;
}
</style>
