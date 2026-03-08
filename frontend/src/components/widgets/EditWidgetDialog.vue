<template>
  <q-dialog v-model="dialogVisible" persistent>
    <q-card style="min-width: 450px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Edit Widget</div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <settings-step
          v-model:title="widgetTitle"
          v-model:options="widgetOptions"
          :widget-type="widgetType"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" color="primary" @click="saveWidget" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SettingsStep from './widget-dialog/SettingsStep.vue'
import type { WidgetConfig } from 'src/components/models'

const props = defineProps<{
  modelValue: boolean
  widget: WidgetConfig | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:widget': [widget: WidgetConfig]
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const widgetTitle = ref('')
const widgetOptions = ref<Record<string, any>>({})
const widgetType = ref('number')

watch(() => props.widget, (newWidget) => {
  if (newWidget) {
    widgetTitle.value = newWidget.title || ''
    widgetOptions.value = { ...newWidget.options }
    widgetType.value = newWidget.type
  }
}, { immediate: true })

function saveWidget() {
  if (props.widget) {
    const updatedWidget: WidgetConfig = {
      ...props.widget,
      title: widgetTitle.value,
      options: { ...widgetOptions.value }
    }
    emit('update:widget', updatedWidget)
    dialogVisible.value = false
  }
}
</script>
