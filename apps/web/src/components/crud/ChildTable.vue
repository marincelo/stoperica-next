<script setup lang="ts">
import type { ChildResource, ModelMeta } from '@stoperica/shared'
import type { DataTableBaseColumn, DataTableColumns, DataTableSortState, PaginationProps } from 'naive-ui'
import { NButton, NCard, NDataTable, NFlex, NInput, NPopconfirm, NSpace, useMessage } from 'naive-ui'
import { computed, h, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { crudApi, type Row } from '@/api/crud'
import FieldValue from '@/components/crud/FieldValue.vue'
import { columnCandidates, defaultColumns } from '@/crud/fields'
import { fieldLabel } from '@/crud/labels'
import { childFormLocation } from '@/crud/parent'
import { useMetaStore } from '@/stores/meta'

const props = defineProps<{ child: ChildResource; parentId: string }>()

const metaStore = useMetaStore()
const router = useRouter()
const message = useMessage()

const meta = computed(() => metaStore.byResource.get(props.child.resource) as ModelMeta)
const rows = ref<Row[]>([])
const loading = ref(false)
const search = ref('')
const state = reactive({
  page: 1,
  pageSize: 50,
  total: 0,
  sort: undefined as string | undefined,
  order: 'asc' as 'asc' | 'desc',
})

const columnsToShow = computed(() =>
  defaultColumns(meta.value).filter((name) => name !== props.child.foreignKey),
)

async function load() {
  loading.value = true
  try {
    const result = await crudApi.list(props.child.resource, {
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort ?? meta.value.displayField,
      order: state.order,
      search: search.value || undefined,
      parentField: props.child.foreignKey,
      parentId: props.parentId,
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
  () => [props.child.resource, props.parentId],
  () => {
    search.value = ''
    Object.assign(state, { page: 1, total: 0, sort: undefined, order: 'asc' })
    load()
  },
  { immediate: true },
)

const idOf = (row: Row) => String(row[meta.value.idField])

async function remove(row: Row) {
  try {
    await crudApi.remove(props.child.resource, idOf(row))
    message.success('Zapis obrisan')
    load()
  } catch (error) {
    message.error((error as Error).message)
  }
}

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
    state.order = 'asc'
  } else {
    state.sort = String(s.columnKey)
    state.order = s.order === 'ascend' ? 'asc' : 'desc'
  }
  state.page = 1
  load()
}

const columns = computed<DataTableColumns<Row>>(() => {
  const fields = columnCandidates(meta.value).filter((f) => columnsToShow.value.includes(f.name))
  fields.sort((a, b) => columnsToShow.value.indexOf(a.name) - columnsToShow.value.indexOf(b.name))
  const sortedKey = state.sort ?? meta.value.displayField
  return [
    ...fields.map((field) => ({
      key: field.name,
      title: fieldLabel(meta.value.name, field.name),
      sorter: true,
      sortOrder: (sortedKey === field.name ? (state.order === 'asc' ? 'ascend' : 'descend') : false) as DataTableBaseColumn['sortOrder'],
      ellipsis: { tooltip: true },
      render: (row: Row) =>
        field.name === meta.value.displayField || field.name === meta.value.idField
          ? h(
              RouterLink,
              { to: { name: 'resource-show', params: { resource: props.child.resource, id: idOf(row) } } },
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
              onClick: () => router.push(childFormLocation(props.child, props.parentId, idOf(row))),
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
  pageSizes: [20, 50, 100, 200],
  prefix: ({ itemCount }) => `Ukupno: ${itemCount}`,
}))
</script>

<template>
  <NCard :title="child.label" segmented>
    <template #header-extra>
      <NFlex :size="8">
        <NInput v-model:value="search" placeholder="Pretraži…" clearable style="width: 220px" />
        <NButton type="primary" @click="router.push(childFormLocation(child, parentId))">Novi zapis</NButton>
      </NFlex>
    </template>
    <NDataTable
      remote
      :columns="columns"
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      :row-key="idOf"
      :scroll-x="Math.max(640, columnsToShow.length * 160 + 170)"
      @update:page="onPage"
      @update:page-size="onPageSize"
      @update:sorter="onSort"
    />
  </NCard>
</template>
