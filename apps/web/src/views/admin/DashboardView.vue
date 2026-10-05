<script setup lang="ts">
import { NCard, NGrid, NGridItem } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useMetaStore } from '@/stores/meta'

const metaStore = useMetaStore()
const router = useRouter()
</script>

<template>
  <h2 style="margin-top: 0">Administracija</h2>
  <NCard
    title="Mjerenje"
    hoverable
    style="margin-bottom: 16px; cursor: pointer"
    @click="router.push({ name: 'timing' })"
  >
    Start kategorija, brojevi, statusi i krugovi.
  </NCard>
  <NGrid cols="1 s:2 m:3 l:4" responsive="screen" :x-gap="16" :y-gap="16">
    <NGridItem v-for="model in metaStore.models" :key="model.resource">
      <NCard
        hoverable
        :title="model.label"
        style="cursor: pointer"
        @click="router.push({ name: 'resource-list', params: { resource: model.resource } })"
      >
        /{{ model.resource }}
      </NCard>
    </NGridItem>
  </NGrid>
</template>
