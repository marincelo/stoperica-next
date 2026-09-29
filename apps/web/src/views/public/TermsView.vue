<script setup lang="ts">
import { NAlert, NCard, useThemeVars } from 'naive-ui'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const EMAIL = 'stoperica.timing@gmail.com'
const themeVars = useThemeVars()
const themeStyle = computed(() => ({
  '--primary': themeVars.value.primaryColor,
  '--muted': themeVars.value.textColor3,
}))
</script>

<template>
  <article class="terms" :style="themeStyle">
    <p class="eyebrow">Privatnost</p>
    <h1>Izjava o korištenju podataka</h1>
    <p class="muted intro">
      Ovu izjavu prihvaćate prilikom <RouterLink :to="{ name: 'signup' }">registracije</RouterLink> natjecatelja na
      Stoperica.live.
    </p>

    <NCard>
      <ol class="points">
        <li>
          <h2>Svrha korištenja</h2>
          <p>
            Ovime dajem privolu da se moji osobni podaci koriste u evidencijske svrhe Stoperica.live timing stranice i
            evidencijske svrhe organizatora natjecanja na koje se prijavljujem.
          </p>
        </li>
        <li>
          <h2>Dijeljenje podataka</h2>
          <p>
            Stoperica.live će ih koristiti samo u te svrhe te ih, osim organizatorima sportskih natjecanja na koja ste
            prijavljeni, neće dostavljati trećim osobama.
          </p>
        </li>
        <li>
          <h2>Kontakt</h2>
          <p>
            Dajem suglasnost da me Stoperica.live i organizator natjecanja na koje sam prijavljen/a imaju pravo
            kontaktirati putem telefona ili elektroničke pošte.
          </p>
        </li>
      </ol>

      <NAlert type="info" :show-icon="false" class="note">
        Prihvaćanje ove izjave obavezno je za registraciju.
      </NAlert>
    </NCard>

    <NCard size="small" class="update">
      <h2>Ažuriranje podataka</h2>
      <p>
        Svoje podatke možete u svakom trenutku promijeniti na stranici
        <RouterLink :to="{ name: 'profile' }">Moj profil</RouterLink> ili zatražiti ažuriranje slanjem e-maila na
        <a :href="`mailto:${EMAIL}`">{{ EMAIL }}</a>.
      </p>
    </NCard>
  </article>
</template>

<style scoped>
.terms {
  max-width: 760px;
  margin: 0 auto;
}
a {
  color: var(--aqua);
}
.muted {
  color: var(--muted);
}
.eyebrow {
  margin: 8px 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--aqua);
}
h1 {
  margin: 0 0 8px;
  font-size: 26px;
  line-height: 1.2;
}
.intro {
  margin: 0 0 20px;
  line-height: 1.6;
}
.points {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: point;
  display: grid;
  gap: 18px;
}
.points li {
  counter-increment: point;
  display: grid;
  grid-template-columns: 32px 1fr;
  column-gap: 12px;
}
.points li::before {
  content: counter(point);
  grid-row: span 2;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
  color: var(--gold);
  background: color-mix(in srgb, var(--gold) 16%, transparent);
}
h2 {
  margin: 4px 0 4px;
  font-size: 16px;
}
p {
  margin: 0;
  line-height: 1.6;
}
.note {
  margin-top: 20px;
}
.update {
  margin-top: 14px;
}
.update h2 {
  margin-top: 0;
}

@media (min-width: 768px) {
  h1 {
    font-size: 32px;
  }
}
</style>
