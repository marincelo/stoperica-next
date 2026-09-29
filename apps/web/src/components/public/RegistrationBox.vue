<script setup lang="ts">
import type { PublicRaceDetail } from '@stoperica/shared'
import { NAlert, NButton, NCard, NCheckbox, NFlex, NPopconfirm, NSelect, NText, useMessage } from 'naive-ui'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { publicApi } from '@/api/public'
import { formatDateTime } from '@/public/format'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ race: PublicRaceDetail }>()
const emit = defineEmits<{ changed: [] }>()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const message = useMessage()

const categoryId = ref<number | null>(null)
const waiverAccepted = ref(false)
const busy = ref(false)

const categoryOptions = computed(() =>
  props.race.categories.filter((c) => c.id !== null).map((c) => ({ label: c.name, value: c.id! })),
)
const myCategory = computed(
  () => props.race.categories.find((c) => c.id === props.race.myRegistration?.categoryId)?.name ?? '—',
)
const canSubmit = computed(() => categoryId.value !== null && (!props.race.waiverRequired || waiverAccepted.value))

async function register() {
  if (!canSubmit.value) return
  busy.value = true
  try {
    await publicApi.register(props.race.id, {
      categoryId: categoryId.value!,
      ...(props.race.waiverRequired ? { waiverAccepted: true } : {}),
    })
    message.success('Prijava je zabilježena')
    emit('changed')
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    busy.value = false
  }
}

async function cancel() {
  busy.value = true
  try {
    await publicApi.cancelRegistration(props.race.id)
    message.success('Odjava je bila uspješna')
    emit('changed')
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <NCard title="Prijava na utrku" size="small">
    <NFlex vertical :size="12">
      <NText depth="3">Rok prijave: {{ formatDateTime(race.registrationThreshold) }}</NText>

      <template v-if="race.myRegistration">
        <NAlert type="success" :show-icon="false">
          Prijavljeni ste u kategoriji <b>{{ myCategory }}</b>.
        </NAlert>
        <NPopconfirm v-if="race.cancellationAllowed" positive-text="Odjavi me" negative-text="Odustani" @positive-click="cancel">
          <template #trigger>
            <NButton secondary type="error" :loading="busy" block>Odjavi se</NButton>
          </template>
          Sigurno se želite odjaviti s utrke?
        </NPopconfirm>
        <NText v-else depth="3" style="font-size: 13px">Odjava više nije moguća.</NText>
      </template>

      <NAlert v-else-if="!race.registrationOpen" type="default" :show-icon="false">Prijave su zatvorene.</NAlert>

      <template v-else-if="!auth.user">
        <NText>Za prijavu na utrku potrebno je prijaviti se.</NText>
        <NButton type="primary" block @click="router.push({ name: 'login', query: { redirect: route.fullPath } })">
          Prijava
        </NButton>
        <NButton type="info" block @click="router.push({ name: 'signup', query: { redirect: route.fullPath } })">
          Nemate profil? Registrirajte se
        </NButton>
      </template>

      <template v-else>
        <NSelect v-model:value="categoryId" :options="categoryOptions" placeholder="Odaberi kategoriju" />
        <NCheckbox v-if="race.waiverRequired" v-model:checked="waiverAccepted">
          Potvrđujem da sam pročitao/la i slažem se s Izjavom o oslobađanju organizatora od odgovornosti.
        </NCheckbox>
        <NButton type="primary" block :disabled="!canSubmit" :loading="busy" @click="register">Prijavi se</NButton>
      </template>
    </NFlex>
  </NCard>
</template>
