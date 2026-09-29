<script setup lang="ts">
import { NButton, NResult } from 'naive-ui'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <NResult status="404" title="Stranica nije pronađena" style="margin-top: 48px">
    <template #footer>
      <NButton @click="router.push({ name: 'races' })">Na početnu</NButton>
    </template>
  </NResult>
</template>
