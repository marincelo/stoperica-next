<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import { NButton, NCard, NFlex, NForm, NFormItem, NSpin, useMessage } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { crudApi, type Row } from '@/api/crud'
import FieldInput from '@/components/crud/FieldInput.vue'
import { emptyFormValue, formFields, fromFormValue, isRequiredInput, toFormValue } from '@/crud/fields'
import { fieldLabel } from '@/crud/labels'
import { useResourceMeta } from '@/crud/useResourceMeta'

const { resource, meta } = useResourceMeta()
const route = useRoute()
const router = useRouter()
const message = useMessage()

const id = computed(() => (route.params.id ? String(route.params.id) : null))
const isEdit = computed(() => id.value !== null)
const fields = computed(() => formFields(meta.value))

const formRef = ref<FormInst | null>(null)
const form = ref<Record<string, unknown>>({})
const initial = ref<Record<string, string>>({})
const loading = ref(false)
const saving = ref(false)

const rules = computed<FormRules>(() =>
  Object.fromEntries(
    fields.value
      .filter(isRequiredInput)
      .map((f) => [
        f.name,
        {
          required: true,
          trigger: ['blur', 'change'],
          validator: (_rule: unknown, value: unknown) =>
            value !== null && value !== undefined && value !== '' ? true : new Error('Obavezno polje'),
        },
      ]),
  ),
)

const snapshot = (value: unknown) => JSON.stringify(value ?? null)

function fillForm(record: Row | null) {
  const values: Record<string, unknown> = {}
  for (const field of fields.value) {
    values[field.name] = record ? toFormValue(field, record[field.name]) : emptyFormValue(field)
  }
  form.value = values
  initial.value = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, snapshot(v)]))
}

async function load() {
  if (!isEdit.value) return fillForm(null)
  loading.value = true
  try {
    fillForm(await crudApi.get(resource.value, id.value!))
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

watch([resource, id], load, { immediate: true })

function buildPayload(): Row {
  const payload: Row = {}
  for (const field of fields.value) {
    const value = form.value[field.name]
    // On edit, send only changed fields so concurrent edits of other fields are not overwritten.
    if (isEdit.value && snapshot(value) === initial.value[field.name]) continue
    try {
      payload[field.name] = fromFormValue(field, value)
    } catch (error) {
      throw new Error(`${fieldLabel(meta.value.name, field.name)}: ${(error as Error).message}`)
    }
  }
  return payload
}

async function submit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  let payload: Row
  try {
    payload = buildPayload()
  } catch (error) {
    return message.error((error as Error).message)
  }

  saving.value = true
  try {
    const saved = isEdit.value
      ? await crudApi.update(resource.value, id.value!, payload)
      : await crudApi.create(resource.value, payload)
    message.success('Spremljeno')
    router.push({ name: 'resource-show', params: { resource: resource.value, id: String(saved[meta.value.idField]) } })
  } catch (error) {
    const details = error instanceof ApiError && Array.isArray(error.details) ? error.details : []
    const fieldErrors = details
      .map((d: { instancePath?: string; message?: string }) => `${d.instancePath?.slice(1) || ''} ${d.message ?? ''}`.trim())
      .join(', ')
    message.error(fieldErrors ? `${(error as Error).message}: ${fieldErrors}` : (error as Error).message)
  } finally {
    saving.value = false
  }
}

function cancel() {
  if (isEdit.value) router.push({ name: 'resource-show', params: { resource: resource.value, id: id.value! } })
  else router.push({ name: 'resource-list', params: { resource: resource.value } })
}
</script>

<template>
  <NSpin :show="loading">
    <NCard :title="isEdit ? `${meta.label}: uređivanje #${id}` : `${meta.label}: novi zapis`">
      <NForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-placement="left"
        label-width="240"
        require-mark-placement="right-hanging"
        style="max-width: 900px"
        @submit.prevent="submit"
      >
        <NFormItem v-for="field in fields" :key="field.name" :path="field.name" :label="fieldLabel(meta.name, field.name)">
          <FieldInput v-model="form[field.name]" :field="field" :enum-values="meta.enums[field.type]" />
        </NFormItem>
        <NFlex justify="end" :size="8">
          <NButton @click="cancel">Odustani</NButton>
          <NButton type="primary" attr-type="submit" :loading="saving">Spremi</NButton>
        </NFlex>
      </NForm>
    </NCard>
  </NSpin>
</template>
