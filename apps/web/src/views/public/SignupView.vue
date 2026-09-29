<script setup lang="ts">
import type { RacerProfile } from '@stoperica/shared'
import { NCard, NText, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ProfileForm from '@/components/public/ProfileForm.vue'
import { safeRedirect } from '@/public/redirect'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)

async function submit(profile: RacerProfile) {
  loading.value = true
  try {
    await auth.signup({ ...profile, termsAccepted: true })
    message.success('Profil je kreiran. Dobrodošli!')
    router.replace(safeRedirect(route.query.redirect))
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="center">
    <NCard title="Registracija natjecatelja" style="width: 720px; max-width: 100%">
      <ProfileForm submit-label="Kreiraj profil" :loading="loading" require-terms @submit="submit" />
      <template #footer>
        <NText depth="3">
          Već imate profil?
          <RouterLink :to="{ name: 'login', query: route.query }">Prijavite se</RouterLink>
        </NText>
      </template>
    </NCard>
  </div>
</template>

<style scoped>
.center {
  display: flex;
  justify-content: center;
}
</style>
