<script setup lang="ts">
import type { PublicRaceSummary } from '@stoperica/shared'
import { NCarousel, NCarouselItem, NEmpty, NFlex, NPagination, NSkeleton, NSpin, useMessage } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { publicApi } from '@/api/public'
import RaceCard from '@/components/public/RaceCard.vue'
import RaceRow from '@/components/public/RaceRow.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

const UPCOMING_LIMIT = 48
const PAGE_SIZE = 10

const route = useRoute()
const router = useRouter()
const message = useMessage()
const isWide = useMediaQuery('(min-width: 768px)')
const isTablet = useMediaQuery('(min-width: 640px)')
const isDesktop = useMediaQuery('(min-width: 1024px)')
const slidesVisible = computed(() => (isDesktop.value ? 3 : isTablet.value ? 2 : 1))
const scrollable = computed(() => upcoming.value.length > slidesVisible.value)

const upcoming = ref<PublicRaceSummary[]>([])
const upcomingLoading = ref(true)

const past = ref<PublicRaceSummary[]>([])
const pastTotal = ref(0)
const pastLoading = ref(false)
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const pastSection = ref<HTMLElement>()

onMounted(async () => {
  try {
    upcoming.value = (await publicApi.races({ scope: 'upcoming', page: 1, pageSize: UPCOMING_LIMIT })).items
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    upcomingLoading.value = false
  }
})

async function loadPast() {
  pastLoading.value = true
  try {
    const result = await publicApi.races({ scope: 'past', page: page.value, pageSize: PAGE_SIZE })
    past.value = result.items
    pastTotal.value = result.total
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    pastLoading.value = false
  }
}

watch(page, loadPast, { immediate: true })

function setPage(p: number) {
  router.push({ name: 'races', query: { ...route.query, page: p > 1 ? String(p) : undefined } })
  pastSection.value?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <NFlex vertical :size="28">
    <section>
      <h2 class="section-title">Nadolazeće utrke</h2>
      <NSkeleton v-if="upcomingLoading" height="320px" :sharp="false" />
      <NEmpty v-else-if="upcoming.length === 0" description="Trenutno nema najavljenih utrka" class="empty" />
      <NCarousel
        v-else
        class="carousel"
        slides-per-view="auto"
        :space-between="12"
        :loop="false"
        :class="{ scrollable }"
        :show-arrow="isWide && scrollable"
        :show-dots="scrollable"
        dot-type="line"
        :draggable="scrollable"
      >
        <NCarouselItem v-for="race in upcoming" :key="race.id" class="slide">
          <RaceCard :race="race" />
        </NCarouselItem>
      </NCarousel>
    </section>

    <section ref="pastSection">
      <h2 class="section-title">Prošle utrke</h2>
      <NSpin :show="pastLoading">
        <NEmpty v-if="!pastLoading && past.length === 0" description="Nema utrka" class="empty" />
        <NFlex v-else vertical :size="10">
          <RaceRow v-for="race in past" :key="race.id" :race="race" />
        </NFlex>
      </NSpin>
      <NFlex v-if="pastTotal > PAGE_SIZE" justify="center" class="pagination">
        <NPagination
          :page="page"
          :page-size="PAGE_SIZE"
          :item-count="pastTotal"
          :page-slot="isWide ? 9 : 5"
          @update:page="setPage"
        />
      </NFlex>
    </section>
  </NFlex>
</template>

<style scoped>
.section-title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 700;
}
.empty {
  margin: 32px 0;
}
.carousel.scrollable {
  padding-bottom: 28px;
}
.carousel :deep(.n-carousel__slide.slide) {
  width: 86%;
  height: auto;
}
.pagination {
  margin-top: 16px;
}
section {
  scroll-margin-top: 72px;
}

@media (min-width: 640px) {
  .carousel :deep(.n-carousel__slide.slide) {
    width: calc((100% - 12px) / 2);
  }
}
@media (min-width: 1024px) {
  .carousel :deep(.n-carousel__slide.slide) {
    width: calc((100% - 24px) / 3);
  }
}
</style>
