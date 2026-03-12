<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-toolbar-title>
          Smart Monitor
        </q-toolbar-title>

        <q-btn
          v-if="isEditMode"
          flat
          dense
          round
          icon="add"
          @click="showAddWidget = true"
        >
          <q-tooltip>Add Widget</q-tooltip>
        </q-btn>

        <q-btn flat dense round icon="more_vert">
          <q-menu touch-position>
            <q-list style="min-width: 150px">
              <q-item clickable v-close-popup @click="toggleEditMode">
                <q-item-section avatar>
                  <q-icon :name="isEditMode ? 'edit' : 'edit_off'" />
                </q-item-section>
                <q-item-section>
                  {{ isEditMode ? 'Edit Mode: ON' : 'Edit Mode: OFF' }}
                </q-item-section>
              </q-item>
              <q-separator />
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

    <!-- Add Widget Dialog -->
    <add-widget-dialog v-model="showAddWidget" />
  </q-layout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useUIStore } from 'stores/ui'
import AddWidgetDialog from 'components/widgets/AddWidgetDialog.vue'

const $q = useQuasar()
const uiStore = useUIStore()

const showAddWidget = ref(false)

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')
const isEditMode = computed(() => uiStore.isEditMode)

function toggleTheme() {
  $q.dark.set(!isDark.value)
}

function toggleEditMode() {
  uiStore.toggleEditMode()
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
