<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-toolbar-title>
          Smart Monitor
        </q-toolbar-title>

        <q-btn flat dense round icon="more_vert">
          <q-menu touch-position>
            <q-list style="min-width: 150px">
              <q-item clickable v-close-popup @click="toggleTheme">
                <q-item-section avatar>
                  <q-icon :name="isDark ? 'light_mode' : 'dark_mode'" />
                </q-item-section>
                <q-item-section>
                  {{ isDark ? 'Light' : 'Dark' }}
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')

function toggleTheme() {
  $q.dark.set(!isDark.value)
}
</script>
