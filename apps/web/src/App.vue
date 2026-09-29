<script setup lang="ts">
import { darkTheme, dateHrHR, hrHR, NConfigProvider, NDialogProvider, NGlobalStyle, NMessageProvider } from 'naive-ui'
import { RouterView } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { themeOverrides } from '@/theme'

const theme = useThemeStore()
</script>

<template>
  <NConfigProvider :theme="theme.isDark ? darkTheme : null" :theme-overrides="themeOverrides" :locale="hrHR" :date-locale="dateHrHR">
    <NGlobalStyle />
    <NMessageProvider>
      <NDialogProvider>
        <RouterView />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
