<script setup lang="ts">
import { NButton, NCard, NCollapse, NCollapseItem, NTag, useThemeVars } from 'naive-ui'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const EMAIL = 'stoperica.timing@gmail.com'
const PHONES = ['091 987 2304', '098 908 5311']

const auth = useAuthStore()
const themeVars = useThemeVars()
const themeStyle = computed(() => ({
  '--primary': themeVars.value.primaryColor,
  '--muted': themeVars.value.textColor3,
  '--divider': themeVars.value.dividerColor,
}))

interface Reference {
  title: string
  image: string
  races: { id: number; name: string }[]
  leagues?: string[]
  note?: { text: string; href: string }
}

const REFERENCES: Reference[] = [
  {
    title: 'Biciklizam',
    image: '/info/finish-line-2.jpg',
    races: [
      { id: 122, name: 'Nacionalno prvenstvo – kronometar' },
      { id: 113, name: 'XCM kup Hrvatske' },
      { id: 112, name: 'XCO Šušnjevača' },
    ],
    leagues: ['XCZLD 2018/19'],
  },
  {
    title: 'Trail & trekking',
    image: '/info/trail.jpg',
    races: [{ id: 116, name: 'Masters of trail' }],
    leagues: ['STrka Trail Liga 2019'],
  },
  {
    title: 'Trčanje',
    image: '/info/finish-line.jpg',
    races: [{ id: 46, name: 'Polumaraton Nin – Zadar' }],
    leagues: ['Polumaraton Nin – Zadar, bodovanje klubova'],
  },
  {
    title: 'Sportsko penjanje',
    image: '/info/climbing.jpg',
    races: [{ id: 94, name: 'Prvenstvo Hrvatske 2018 – SP Težinsko' }],
    note: {
      text: 'Razvili smo mjerni sustav za državno prvenstvo Republike Hrvatske u brzinskom penjanju.',
      href: 'https://www.facebook.com/marulianus/videos/426804711236376/',
    },
  },
]

const telHref = (phone: string) => `tel:+385${phone.replace(/\D/g, '').replace(/^0/, '')}`
</script>

<template>
  <div class="info" :style="themeStyle">
    <section class="hero">
      <p class="eyebrow">O nama</p>
      <h1>Mjerenje vremena i rezultati za vašu utrku</h1>
      <p class="lead">
        Timing platforma Stoperica.live temelji se na jedinstvenoj pohrani rezultata natjecatelja u bazu i njihovoj
        obradi. Prema zahtjevu organizatora možemo kreirati automatski sustav bodovanja natjecatelja, klubova ili
        cjelokupne lige.
      </p>
      <div class="features">
        <div class="feature">
          <span class="feature-icon">⚡</span>
          <div>
            <strong>Vlastiti sustav</strong>
            <p>Cjelokupan sustav razvijan je samostalno, uz korištenje tehnologije visokih performansi.</p>
          </div>
        </div>
        <div class="feature">
          <span class="feature-icon">📡</span>
          <div>
            <strong>Vlastita oprema</strong>
            <p>
              Posjedujemo raznovrsnu mjernu opremu, od koje je dio samostalno osmišljen i izgrađen te predstavlja
              inovativna rješenja na tržištu.
            </p>
          </div>
        </div>
        <div class="feature">
          <span class="feature-icon">🏆</span>
          <div>
            <strong>Bodovanje i lige</strong>
            <p>Automatski izračun bodova za natjecatelje, klubove i cijele lige.</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>Česta pitanja</h2>
      <NCard size="small" content-style="padding: 4px 16px">
        <NCollapse accordion :default-expanded-names="['register']" display-directive="show">
          <NCollapseItem title="Kako se prijaviti na utrku?" name="register">
            <ol class="steps">
              <li>
                <template v-if="auth.user">Prijavljeni ste na stranicu</template>
                <template v-else>
                  <RouterLink :to="{ name: 'signup' }">Registrirajte se</RouterLink> ili se
                  <RouterLink :to="{ name: 'login' }">prijavite</RouterLink> na stranicu
                </template>
              </li>
              <li>Na popisu <RouterLink :to="{ name: 'races' }">utrka</RouterLink> odaberite utrku</li>
              <li>U prijavama utrke odaberite kategoriju i potvrdite na „Prijavi se”</li>
            </ol>
          </NCollapseItem>
          <NCollapseItem title="Kako se ponovno prijaviti na stranicu?" name="login">
            <p>
              Za prijavu koristite e-mail adresu i broj mobitela koje ste unijeli prilikom registracije. Lozinka nije
              potrebna.
            </p>
          </NCollapseItem>
          <NCollapseItem title="Imam problem s prijavom ili rezultatom" name="help">
            <p>
              Javite nam se na <a :href="`mailto:${EMAIL}`">{{ EMAIL }}</a> ili nazovite na
              <a :href="telHref(PHONES[0]!)">{{ PHONES[0] }}</a>.
            </p>
          </NCollapseItem>
        </NCollapse>
      </NCard>
    </section>

    <section>
      <h2>Reference</h2>
      <div class="references">
        <NCard v-for="item in REFERENCES" :key="item.title" class="reference" content-style="padding: 14px 16px 16px">
          <template #cover>
            <div class="reference-cover">
              <img :src="item.image" :alt="item.title" loading="lazy" />
              <span class="reference-title">{{ item.title }}</span>
            </div>
          </template>
          <div class="chips">
            <RouterLink v-for="race in item.races" :key="race.id" :to="{ name: 'race', params: { id: race.id } }">
              <NTag round :bordered="false" type="info" class="chip">{{ race.name }} →</NTag>
            </RouterLink>
            <NTag v-for="league in item.leagues" :key="league" round :bordered="false" class="chip">{{ league }}</NTag>
          </div>
          <p v-if="item.note" class="note">
            {{ item.note.text }}
            <a :href="item.note.href" target="_blank" rel="noopener noreferrer">Pogledaj video</a>
          </p>
        </NCard>
      </div>
    </section>

    <section>
      <h2>Kontakt</h2>
      <div class="contact">
        <NCard size="small">
          <strong class="company">Štoperica, obrt za usluge</strong>
          <p class="muted">Stankovci 267, 23422 Stankovci</p>
          <div class="contact-actions">
            <NButton tag="a" :href="`mailto:${EMAIL}`" type="primary">{{ EMAIL }}</NButton>
            <NButton v-for="phone in PHONES" :key="phone" tag="a" :href="telHref(phone)" secondary>
              Nazovi {{ phone }}
            </NButton>
          </div>
        </NCard>
        <NCard size="small" title="Podaci o obrtu">
          <dl class="company-data">
            <dt>OIB</dt>
            <dd>39751832773</dd>
            <dt>Matični broj obrta</dt>
            <dd>97958085</dd>
            <dt>Bankovni račun</dt>
            <dd>HR6023600001102757273</dd>
            <dt>Poslovna banka</dt>
            <dd>Zagrebačka banka d.d.</dd>
          </dl>
          <RouterLink :to="{ name: 'terms' }" class="terms-link">Izjava o korištenju podataka ›</RouterLink>
        </NCard>
      </div>
    </section>
  </div>
</template>

<style scoped>
.info {
  display: flex;
  flex-direction: column;
  gap: 36px;
}
h2 {
  margin: 0 0 12px;
  font-size: 20px;
}
a {
  color: var(--aqua);
}
.muted {
  color: var(--muted);
}

.hero {
  padding: 24px 18px;
  border-radius: 14px;
  border: 1px solid var(--divider);
  background:
    radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--aqua-deep) 30%, transparent), transparent 60%),
    radial-gradient(120% 120% at 100% 100%, color-mix(in srgb, var(--gold-2) 22%, transparent), transparent 60%);
}
.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--aqua);
}
.hero h1 {
  margin: 0 0 12px;
  font-size: 26px;
  line-height: 1.2;
}
.lead {
  margin: 0;
  line-height: 1.6;
  max-width: 720px;
}
.features {
  margin-top: 20px;
  display: grid;
  gap: 14px;
}
.feature {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.feature-icon {
  font-size: 20px;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--gold) 18%, transparent);
}
.feature p {
  margin: 2px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
}

.steps {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}
:deep(.n-collapse-item) p {
  margin: 0;
  line-height: 1.6;
}

.references {
  display: grid;
  gap: 14px;
}
.reference-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
.reference-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.reference-title {
  position: absolute;
  inset: auto 0 0 0;
  padding: 28px 16px 12px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chips a {
  text-decoration: none;
}
.chip {
  cursor: default;
}
.chips a .chip {
  cursor: pointer;
}
.note {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
}

.contact {
  display: grid;
  gap: 14px;
}
.company {
  font-size: 16px;
}
.contact .muted {
  margin: 4px 0 14px;
}
.contact-actions {
  display: grid;
  gap: 8px;
}
.contact-actions a {
  color: inherit;
  min-width: 0;
  width: auto;
}
.company-data {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
  font-size: 14px;
}
.company-data dt {
  color: var(--muted);
}
.terms-link {
  display: inline-block;
  margin-top: 14px;
  font-size: 14px;
  text-decoration: none;
}
.company-data dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}

@media (min-width: 768px) {
  .hero {
    padding: 40px 36px;
  }
  .hero h1 {
    font-size: 34px;
  }
  .features {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .references {
    grid-template-columns: repeat(2, 1fr);
  }
  .contact {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
