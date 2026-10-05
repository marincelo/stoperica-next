import type {
  ListResponse,
  TimingCategory,
  TimingRace,
  TimingRaceSummary,
  TimingResult,
  TimingLap,
} from '@stoperica/shared'
import { http } from './http'

export interface TimingRacerHit {
  id: number
  firstName: string | null
  lastName: string | null
  country: string | null
  club: string | null
}

export const timingApi = {
  races: (query: { q?: string; page?: number } = {}) =>
    http.get<ListResponse<TimingRaceSummary>>('/admin/timing/races', query),
  racers: (q: string) => http.get<TimingRacerHit[]>('/admin/timing/racers', { q }),
  race: (raceId: number) => http.get<TimingRace>(`/admin/timing/races/${raceId}`),
  startCategory: (raceId: number, categoryId: number) =>
    http.post<{ startedAt: string; updated: number }>(`/admin/timing/races/${raceId}/categories/${categoryId}/start`),
  register: (raceId: number, body: { racerId: number; categoryId: number }) =>
    http.post<{ id: number }>(`/admin/timing/races/${raceId}/results`, body),
  updateResult: (raceId: number, resultId: number, body: { status?: number; laps?: TimingLap[] }) =>
    http.patch<{ ok: true }>(`/admin/timing/races/${raceId}/results/${resultId}`, body),
  unregister: (raceId: number, resultId: number) =>
    http.delete(`/admin/timing/races/${raceId}/results/${resultId}`),
}

export type { TimingCategory, TimingResult }
