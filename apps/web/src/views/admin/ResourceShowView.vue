<script setup lang="ts">
import { NButton, NCard, NDescriptions, NDescriptionsItem, NFlex, NPopconfirm, NSelect, NSpin, useMessage } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { crudApi, type Row } from '@/api/crud'
import ChildTable from '@/components/crud/ChildTable.vue'
import FieldValue from '@/components/crud/FieldValue.vue'
import { displayFieldsOf, displayLabel, valueFields } from '@/crud/fields'
import { fieldLabel } from '@/crud/labels'
import { useResourceMeta } from '@/crud/useResourceMeta'

const { resource, meta } = useResourceMeta()
const route = useRoute()
const router = useRouter()
const message = useMessage()

const id = computed(() => String(route.params.id))
const record = ref<Row | null>(null)
const loading = ref(false)
const isLeague = computed(() => meta.value?.name === 'League')
const clubIds = ref<number[]>([])
const initialClubs = ref('')
const clubOptions = ref<{ label: string; value: number }[]>([])
const clubsLoading = ref(false)
const savingClubs = ref(false)
const clubKey = (ids: number[]) => JSON.stringify([...ids].sort((a, b) => a - b))
const clubsDirty = computed(() => clubKey(clubIds.value) !== initialClubs.value)

const title = computed(() => {
  if (!record.value) return meta.value.label
  return displayLabel(record.value, displayFieldsOf(meta.value), `${meta.value.label} #${id.value}`)
})

async function loadClubs() {
  if (!isLeague.value) return
  clubsLoading.value = true
  try {
    const [options, current] = await Promise.all([crudApi.options('clubs'), crudApi.leagueClubs(id.value)])
    clubOptions.value = options.map((option) => ({ label: option.label, value: Number(option.value) }))
    clubIds.value = current.clubIds
    initialClubs.value = clubKey(current.clubIds)
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    clubsLoading.value = false
  }
}

async function saveClubs() {
  savingClubs.value = true
  try {
    const saved = await crudApi.saveLeagueClubs(id.value, clubIds.value)
    clubIds.value = saved.clubIds
    initialClubs.value = clubKey(saved.clubIds)
    message.success('Klubovi su spremljeni')
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    savingClubs.value = false
  }
}

async function load() {
  loading.value = true
  try {
    record.value = await crudApi.get(resource.value, id.value)
    await loadClubs()
  } catch (error) {
    message.error((error as Error).message)
    record.value = null
  } finally {
    loading.value = false
  }
}

async function remove() {
  try {
    await crudApi.remove(resource.value, id.value)
    message.success('Zapis obrisan')
    router.push({ name: 'resource-list', params: { resource: resource.value } })
  } catch (error) {
    message.error((error as Error).message)
  }
}

watch([resource, id], load, { immediate: true })
</script>

<template>
  <NSpin :show="loading">
    <NFlex vertical :size="16">
      <NCard :title="title">
        <template #header-extra>
          <NFlex :size="8">
            <NButton @click="router.push({ name: 'resource-list', params: { resource } })">Natrag</NButton>
            <NButton type="primary" @click="router.push({ name: 'resource-edit', params: { resource, id } })">
              Uredi
            </NButton>
            <NPopconfirm positive-text="Obriši" negative-text="Odustani" @positive-click="remove">
              <template #trigger>
                <NButton type="error" secondary>Obriši</NButton>
              </template>
              Sigurno obrisati ovaj zapis?
            </NPopconfirm>
          </NFlex>
        </template>

        <NDescriptions v-if="record" :column="1" label-placement="left" bordered label-style="width: 240px">
          <NDescriptionsItem v-for="field in valueFields(meta)" :key="field.name" :label="fieldLabel(meta.name, field.name)">
            <FieldValue :field="field" :row="record" />
          </NDescriptionsItem>
        </NDescriptions>
      </NCard>

      <NCard v-if="isLeague && record" title="Klubovi">
        <NSelect
          v-model:value="clubIds"
          multiple
          filterable
          :options="clubOptions"
          :loading="clubsLoading"
          :max-tag-count="8"
          placeholder="Odaberi klubove…"
        />
        <p class="hint">Uklanjanje kluba briše i njegove bodove u ovom natjecanju.</p>
        <NFlex justify="end">
          <NButton type="primary" :loading="savingClubs" :disabled="!clubsDirty" @click="saveClubs">Spremi</NButton>
        </NFlex>
      </NCard>

      <ChildTable v-for="child in meta.children" :key="child.resource + child.foreignKey" :child="child" :parent-id="id" />
    </NFlex>
  </NSpin>
</template>

<style scoped>
.hint {
  margin: 6px 0 12px;
  font-size: 12px;
  opacity: 0.7;
}
</style>
