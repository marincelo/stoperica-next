<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import { NButton, NCard, NForm, NFormItem, NInput, NText, useMessage } from 'naive-ui'
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { safeRedirect } from '@/public/redirect'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const form = reactive({ email: '', phone: '' })
const loading = ref(false)

const rules: FormRules = {
  email: { required: true, message: 'Unesite e-mail', trigger: 'blur' },
  phone: { required: true, message: 'Unesite broj telefona', trigger: 'blur' },
}

async function submit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    await auth.login(form.email, form.phone)
    router.replace(safeRedirect(route.query.redirect))
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="center">
    <NCard title="Prijava" style="width: 400px; max-width: 100%">
      <NForm ref="formRef" :model="form" :rules="rules" @submit.prevent="submit">
        <NFormItem label="E-mail" path="email">
          <NInput v-model:value="form.email" :input-props="{ type: 'email', autocomplete: 'email' }" />
        </NFormItem>
        <NFormItem label="Broj mobitela" path="phone">
          <NInput v-model:value="form.phone" placeholder="npr. 091 234 5678" :input-props="{ type: 'tel', autocomplete: 'tel' }" />
        </NFormItem>
        <NButton type="primary" block attr-type="submit" :loading="loading">Prijava</NButton>
      </NForm>
      <template #footer>
        <NText depth="3">
          Nemate profil?
          <RouterLink :to="{ name: 'signup', query: route.query }">Registrirajte se</RouterLink>
        </NText>
      </template>
    </NCard>
  </div>
</template>

<style scoped>
.center {
  display: flex;
  justify-content: center;
  padding-top: 32px;
}
</style>
