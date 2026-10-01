import type {
  ClubOption,
  LeagueDetail,
  LeagueSummary,
  ListResponse,
  MyRegistration,
  PublicRaceDetail,
  PublicRaceSummary,
  PublicRacerProfile,
  RacerProfile,
} from '@stoperica/shared'
import { http } from './http'

export const publicApi = {
  races: (query: { scope: 'upcoming' | 'past'; page: number; pageSize?: number }) =>
    http.get<ListResponse<PublicRaceSummary>>('/races', query),
  race: (id: string | number) => http.get<PublicRaceDetail>(`/races/${id}`),
  racer: (id: string | number) => http.get<PublicRacerProfile>(`/racers/${id}`),
  register: (raceId: number, body: { categoryId: number; waiverAccepted?: boolean }) =>
    http.post<MyRegistration>(`/races/${raceId}/registration`, body),
  cancelRegistration: (raceId: number) => http.delete(`/races/${raceId}/registration`),
  clubs: () => http.get<ClubOption[]>('/clubs'),
  profile: () => http.get<Partial<RacerProfile>>('/me/profile'),
  updateProfile: (profile: RacerProfile) => http.put<Partial<RacerProfile>>('/me/profile', profile),
  leagues: () => http.get<LeagueSummary[]>('/leagues'),
  league: (slug: string) => http.get<LeagueDetail>(`/leagues/${encodeURIComponent(slug)}`),
}
