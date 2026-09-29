<script setup lang="ts">
import type { ClubOption, RacerProfile } from '@stoperica/shared'
import type { FormInst, FormItemRule, FormRules } from 'naive-ui'
import {
  NButton, NCheckbox, NForm, NFormItem, NFormItemGi, NGrid, NInput, NInputNumber, NRadio, NRadioGroup, NSelect, NSpace,
} from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { publicApi } from '@/api/public'
import { countryOptions } from '@/public/countries'

type FormModel = Omit<RacerProfile, 'gender' | 'dayOfBirth' | 'monthOfBirth' | 'yearOfBirth' | 'shirtSize'> & {
  gender: 1 | 2 | null
  dayOfBirth: number | null
  monthOfBirth: number | null
  yearOfBirth: number | null
  shirtSize: RacerProfile['shirtSize'] | null
}

const props = defineProps<{
  initial?: Partial<RacerProfile>
  submitLabel: string
  loading?: boolean
  /** Sign-up only: require accepting the data usage statement. */
  requireTerms?: boolean
}>()
const emit = defineEmits<{ submit: [profile: RacerProfile] }>()

const formRef = ref<FormInst | null>(null)
const form = reactive<FormModel>({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  gender: null,
  dayOfBirth: null,
  monthOfBirth: null,
  yearOfBirth: null,
  clubId: null,
  address: '',
  zipCode: '',
  town: '',
  country: 'HR',
  shirtSize: null,
  uciId: null,
  ...props.initial,
})

const clubs = ref<ClubOption[]>([])
onMounted(async () => {
  clubs.value = await publicApi.clubs()
})
const clubOptions = computed(() => clubs.value.map((c) => ({ label: c.name, value: c.id })))
const shirtOptions = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((s) => ({ label: s, value: s }))
const monthOptions = [
  'siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj',
  'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac',
].map((label, i) => ({ label, value: i + 1 }))

const required = (message: string): FormItemRule => ({
  required: true,
  trigger: ['blur', 'change'],
  validator: (_rule, value) => (value === null || value === undefined || value === '' ? new Error(message) : true),
})

const rules: FormRules = {
  firstName: required('Unesite ime'),
  lastName: required('Unesite prezime'),
  email: [required('Unesite e-mail'), { type: 'email', message: 'Neispravan e-mail', trigger: 'blur' }],
  phoneNumber: [
    required('Unesite broj mobitela'),
    { pattern: /^[+0-9 ()/-]{6,30}$/, message: 'Neispravan broj mobitela', trigger: 'blur' },
  ],
  gender: required('Odaberite spol'),
  dayOfBirth: required('Dan'),
  monthOfBirth: required('Mjesec'),
  yearOfBirth: required('Godina'),
  address: required('Unesite adresu'),
  zipCode: required('Unesite poštanski broj'),
  town: required('Unesite mjesto'),
  country: required('Odaberite državu'),
  shirtSize: required('Odaberite veličinu majice'),
  uciId: { pattern: /^[0-9\s]{3,14}$/, message: 'UCI ID ima 3 do 14 znamenki', trigger: 'blur' },
}

const termsAccepted = ref(false)
const termsError = ref(false)

async function submit() {
  termsError.value = Boolean(props.requireTerms && !termsAccepted.value)
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  if (termsError.value) return
  emit('submit', { ...form, uciId: form.uciId?.trim() || null } as RacerProfile)
}
</script>

<template>
  <NForm ref="formRef" :model="form" :rules="rules" @submit.prevent="submit">
    <NGrid cols="1 s:2" responsive="screen" :x-gap="16">
      <NFormItemGi label="Ime" path="firstName">
        <NInput v-model:value="form.firstName" :input-props="{ autocomplete: 'given-name' }" />
      </NFormItemGi>
      <NFormItemGi label="Prezime" path="lastName">
        <NInput v-model:value="form.lastName" :input-props="{ autocomplete: 'family-name' }" />
      </NFormItemGi>
      <NFormItemGi label="E-mail" path="email">
        <NInput v-model:value="form.email" :input-props="{ type: 'email', autocomplete: 'email' }" />
      </NFormItemGi>
      <NFormItemGi label="Broj mobitela" path="phoneNumber">
        <NInput v-model:value="form.phoneNumber" placeholder="npr. 091 234 5678" :input-props="{ type: 'tel', autocomplete: 'tel' }" />
      </NFormItemGi>
      <NFormItemGi label="Spol" path="gender">
        <NRadioGroup v-model:value="form.gender">
          <NSpace>
            <NRadio :value="1">Ženski</NRadio>
            <NRadio :value="2">Muški</NRadio>
          </NSpace>
        </NRadioGroup>
      </NFormItemGi>
      <NFormItemGi label="Veličina majice" path="shirtSize">
        <NSelect v-model:value="form.shirtSize" :options="shirtOptions" />
      </NFormItemGi>
    </NGrid>

    <NGrid :cols="3" :x-gap="12">
      <NFormItemGi label="Dan rođenja" path="dayOfBirth">
        <NInputNumber v-model:value="form.dayOfBirth" :min="1" :max="31" :precision="0" :show-button="false" style="width: 100%" />
      </NFormItemGi>
      <NFormItemGi label="Mjesec" path="monthOfBirth">
        <NSelect v-model:value="form.monthOfBirth" :options="monthOptions" />
      </NFormItemGi>
      <NFormItemGi label="Godina" path="yearOfBirth">
        <NInputNumber v-model:value="form.yearOfBirth" :min="1900" :max="new Date().getFullYear()" :precision="0" :show-button="false" style="width: 100%" />
      </NFormItemGi>
    </NGrid>

    <NGrid cols="1 s:2" responsive="screen" :x-gap="16">
      <NFormItemGi label="Adresa" path="address" span="1 s:2">
        <NInput v-model:value="form.address" :input-props="{ autocomplete: 'street-address' }" />
      </NFormItemGi>
      <NFormItemGi label="Poštanski broj" path="zipCode">
        <NInput v-model:value="form.zipCode" :input-props="{ autocomplete: 'postal-code' }" />
      </NFormItemGi>
      <NFormItemGi label="Mjesto" path="town">
        <NInput v-model:value="form.town" :input-props="{ autocomplete: 'address-level2' }" />
      </NFormItemGi>
      <NFormItemGi label="Država" path="country">
        <NSelect v-model:value="form.country" :options="countryOptions" filterable />
      </NFormItemGi>
      <NFormItemGi label="Klub" path="clubId">
        <NSelect v-model:value="form.clubId" :options="clubOptions" filterable clearable placeholder="Bez kluba (Individual)" />
      </NFormItemGi>
      <NFormItemGi label="UCI ID (za licencirane bicikliste)" path="uciId" span="1 s:2">
        <NInput v-model:value="form.uciId" placeholder="Ostavite prazno ako nemate licencu" clearable />
      </NFormItemGi>
    </NGrid>

    <NFormItem
      v-if="requireTerms"
      :show-label="false"
      :validation-status="termsError ? 'error' : undefined"
      :feedback="termsError ? 'Za registraciju je potrebno prihvatiti izjavu' : undefined"
    >
      <NCheckbox v-model:checked="termsAccepted" @update:checked="(value: boolean) => value && (termsError = false)">
        Prihvaćam
        <RouterLink :to="{ name: 'terms' }" target="_blank" @click.stop>Izjavu o korištenju podataka</RouterLink>
      </NCheckbox>
    </NFormItem>

    <NButton type="primary" attr-type="submit" :loading="loading" block>{{ submitLabel }}</NButton>
  </NForm>
</template>
