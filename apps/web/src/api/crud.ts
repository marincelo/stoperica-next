import type { ListQuery, ListResponse, OptionItem } from '@stoperica/shared'
import { http } from './http'

export type Row = Record<string, unknown>

export const crudApi = {
  list: (resource: string, query: ListQuery) =>
    http.get<ListResponse<Row>>(`/admin/${resource}`, { ...query }),
  get: (resource: string, id: string) => http.get<Row>(`/admin/${resource}/${encodeURIComponent(id)}`),
  create: (resource: string, data: Row) => http.post<Row>(`/admin/${resource}`, data),
  update: (resource: string, id: string, data: Row) =>
    http.patch<Row>(`/admin/${resource}/${encodeURIComponent(id)}`, data),
  remove: (resource: string, id: string) => http.delete(`/admin/${resource}/${encodeURIComponent(id)}`),
  options: (resource: string, query: { search?: string; ids?: string }) =>
    http.get<OptionItem[]>(`/admin/${resource}/options`, query),
}
