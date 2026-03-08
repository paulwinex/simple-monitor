<template>
  <div class="q-pa-md">
    <div class="text-subtitle2 q-mb-md">Select Widget Type</div>
    <div class="row q-col-gutter-md">
      <div
        v-for="type in availableTypes"
        :key="type.value"
        class="col-12 col-sm-6 col-md-4"
      >
        <q-card
          class="cursor-pointer"
          :class="{ 'bg-primary text-white': selectedType === type.value }"
          @click="selectType(type.value)"
        >
          <q-card-section class="text-center q-py-lg">
            <q-icon :name="getTypeIcon(type.value)" size="48px" />
            <div class="text-h6 q-mt-sm">{{ type.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDashboardStore } from 'stores/dashboard'

const props = defineProps<{
  selectedType: string
  parentType?: string
}>()

const emit = defineEmits<{
  'update:selectedType': [value: string]
  'select': [value: string]
}>()

const dashboardStore = useDashboardStore()

const availableTypes = computed(() => {
  return dashboardStore.getAvailableWidgetTypes(props.parentType)
})

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    number: 'tag',
    chart: 'timeline',
    bar: 'bar_chart',
    pie: 'pie_chart',
    gridContainer: 'view_compact'
  }
  return icons[type] || 'widgets'
}

function selectType(type: string) {
  emit('update:selectedType', type)
  emit('select', type)
}
</script>

<style scoped>
.q-card {
  transition: all 0.3s;
}

.q-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>
