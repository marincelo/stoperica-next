<script setup lang="ts">
import type { DataTableBaseColumn, DataTableColumns, DataTableSortState, PaginationProps } from 'naive-ui'
import {
  NButton,
  NCheckbox,
  NCheckboxGroup,
  NDataTable,
  NFlex,
  NInput,
  NPopconfirm,
  NPopover,
  NSpace,
  useMessage,
} from 'naive-ui'
import { computed, h, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { crudApi, type Row } from '@/api/crud'
import FieldValue from '@/components/crud/FieldValue.vue'
import { columnCandidates, defaultColumns } from '@/crud/fields'
import { fieldLabel } from '@/crud/labels'
import { useResourceMeta } from '@/crud/useResourceMeta'

const { resource, meta } = useResourceMeta()
const router = useRouter()
const message = useMessage()

const rows = ref<Row[]>([])
const loading = ref(false)
const search = ref('')
const state = reactive({ page: 1, pageSize: 20, total: 0, sort: undefined as string | undefined, order: 'desc' as 'asc' | 'desc' })

const storageKey = computed(() => `stoperica-admin:columns:${resource.value}`)
const visibleColumns = ref<string[]>([])

function loadColumnPrefs() {
  const saved = localStorage.getItem(storageKey.value)
  const available = new Set(columnCandidates(meta.value).map((f) => f.name))
  const parsed: string[] = saved ? JSON.parse(saved) : []
  const valid = parsed.filter((c) => available.has(c))
  visibleColumns.value = valid.length ? valid : defaultColumns(meta.value)
}

watch(visibleColumns, (value) => localStorage.setItem(storageKey.value, JSON.stringify(value)))

async function load() {
  loading.value = true
  try {
    const result = await crudApi.list(resource.value, {
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort,
      order: state.order,
      search: search.value || undefined,
    })
    rows.value = result.items
    state.total = result.total
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    state.page = 1
    load()
  }, 300)
})

watch(
  resource,
  () => {
    search.value = ''
    Object.assign(state, { page: 1, total: 0, sort: undefined, order: 'desc' })
    loadColumnPrefs()
    load()
  },
  { immediate: true },
)

const idOf = (row: Row) => String(row[meta.value.idField])

async function remove(row: Row) {
  try {
    await crudApi.remove(resource.value, idOf(row))
    message.success('Zapis obrisan')
    load()
  } catch (error) {
    message.error((error as Error).message)
  }
}

const columns = computed<DataTableColumns<Row>>(() => {
  const fields = columnCandidates(meta.value).filter((f) => visibleColumns.value.includes(f.name))
  fields.sort((a, b) => visibleColumns.value.indexOf(a.name) - visibleColumns.value.indexOf(b.name))
  return [
    ...fields.map((field) => ({
      key: field.name,
      title: fieldLabel(meta.value.name, field.name),
      sorter: true,
      sortOrder: (state.sort === field.name ? (state.order === 'asc' ? 'ascend' : 'descend') : false) as DataTableBaseColumn['sortOrder'],
      ellipsis: { tooltip: true },
      render: (row: Row) =>
        field.name === meta.value.displayField || field.name === meta.value.idField
          ? h(
              RouterLink,
              { to: { name: 'resource-show', params: { resource: resource.value, id: idOf(row) } } },
              () => String(row[field.name] ?? '—'),
            )
          : h(FieldValue, { field, row, compact: true }),
    })),
    {
      key: '__actions',
      title: '',
      width: 170,
      fixed: 'right' as const,
      render: (row: Row) =>
        h(NSpace, { size: 'small', justify: 'end', wrap: false }, () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => router.push({ name: 'resource-edit', params: { resource: resource.value, id: idOf(row) } }),
            },
            () => 'Uredi',
          ),
          h(
            NPopconfirm,
            { onPositiveClick: () => remove(row), positiveText: 'Obriši', negativeText: 'Odustani' },
            {
              trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, () => 'Obriši'),
              default: () => 'Sigurno obrisati ovaj zapis?',
            },
          ),
        ]),
    },
  ]
})

const pagination = computed<PaginationProps>(() => ({
  page: state.page,
  pageSize: state.pageSize,
  itemCount: state.total,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: ({ itemCount }) => `Ukupno: ${itemCount}`,
}))

function onPage(page: number) {
  state.page = page
  load()
}

function onPageSize(pageSize: number) {
  state.pageSize = pageSize
  state.page = 1
  load()
}

function onSort(sorter: DataTableSortState | DataTableSortState[] | null) {
  const s = Array.isArray(sorter) ? sorter[0] : sorter
  if (!s || s.order === false) {
    state.sort = undefined
    state.order = 'desc'
  } else {
    state.sort = String(s.columnKey)
    state.order = s.order === 'ascend' ? 'asc' : 'desc'
  }
  state.page = 1
  load()
}
</script>

<template>
  <NFlex vertical :size="16">
    <NFlex justify="space-between" align="center">
      <h2 class="title">{{ meta.label }}</h2>
      <NFlex :size="8">
        <NInput v-model:value="search" placeholder="Pretraži…" clearable style="width: 260px" />
        <NPopover trigger="click" placement="bottom-end" scrollable style="max-height: 420px">
          <template #trigger>
            <NButton>Stupci</NButton>
          </template>
          <NCheckboxGroup v-model:value="visibleColumns">
            <NFlex vertical :size="4">
              <NCheckbox
                v-for="field in columnCandidates(meta)"
                :key="field.name"
                :value="field.name"
                :label="fieldLabel(meta.name, field.name)"
              />
            </NFlex>
          </NCheckboxGroup>
        </NPopover>
        <NButton type="primary" @click="router.push({ name: 'resource-new', params: { resource } })">
          Novi zapis
        </NButton>
      </NFlex>
    </NFlex>

    <NDataTable
      remote
      :columns="columns"
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      :row-key="idOf"
      :scroll-x="Math.max(900, visibleColumns.length * 160 + 170)"
      @update:page="onPage"
      @update:page-size="onPageSize"
      @update:sorter="onSort"
    />
  </NFlex>
</template>

<style scoped>
.title {
  margin: 0;
}
</style>
