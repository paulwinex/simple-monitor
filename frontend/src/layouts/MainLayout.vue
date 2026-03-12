<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')

function toggleTheme() {
  $q.dark.set(!isDark.value)
}
</script>

<style scoped>
.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 4px;
}
</style>
