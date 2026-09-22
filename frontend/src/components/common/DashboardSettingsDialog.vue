<template>
  <DraggableDialog
    v-model="dialogVisible"
    title="Dashboard Settings"
    state-key="dashboard-settings"
    :width="'38%'"
    :height="'52%'"
    :position="{ x: 96, y: 72 }"
    :before-close="handleBeforeClose"
  >
    <div class="column q-gap-md">
      <p class="text-caption">
        Drag the window by its header, resize it with the bottom-right corner.
        Press ESC or the close button while "unsaved changes" is on to test the close guard.
      </p>

      <div class="row items-center justify-between rounded-borders bg-grey-9 q-pa-md">
        <span>Interface theme</span>
        <q-btn
          round
          flat
          dense
          :icon="$q.dark.mode ? 'light_mode' : 'dark_mode'"
          :label="$q.dark.mode ? 'Light' : 'Dark'"
          @click="toggleDarkMode"
        />
      </div>

      <q-toggle
        v-model="unsaved"
        label="Simulate unsaved changes"
      />
    </div>
  </DraggableDialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import DraggableDialog from './DraggableDialog.vue'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const unsaved = ref(false)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

function toggleDarkMode() {
  $q.dark.set(!$q.dark.mode)
}

function handleBeforeClose() {
  if (!unsaved.value) return true

  return new Promise((resolve) => {
    $q.dialog({
      title: 'Discard changes?',
      message: 'You have unsaved changes. Close this dialog anyway?',
      cancel: {
        label: 'Keep Editing',
        color: 'primary',
        flat: true
      },
      ok: {
        label: 'Close',
        color: 'negative',
        flat: true
      },
      persistent: true
    }).onOk(() => resolve(true)).onCancel(() => resolve(false)).onDismiss(() => resolve(false))
  })
}
</script>