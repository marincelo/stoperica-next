<script setup lang="ts">
import type { RacerProfile } from '@stoperica/shared'
import { NCard, NSpin, useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { publicApi } from '@/api/public'
import ProfileForm from '@/components/public/ProfileForm.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const message = useMessage()
const profile = ref<Partial<RacerProfile> | null>(null)
const saving = ref(false)

onMounted(async () => {
  try {
    profile.value = await publicApi.profile()
  } catch (error) {
    message.error((error as Error).message)
  }
})

async function submit(value: RacerProfile) {
  saving.value = true
  try {
    profile.value = await publicApi.updateProfile(value)
    await auth.fetchMe()
    message.success('Profil je spremljen')
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="center">
    <NCard title="Moj profil" style="width: 720px; max-width: 100%">
      <NSpin :show="!profile">
        <ProfileForm v-if="profile" :initial="profile" submit-label="Spremi promjene" :loading="saving" @submit="submit" />
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped>
.center {
  display: flex;
  justify-content: center;
}
</style>
