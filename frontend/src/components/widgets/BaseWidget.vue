<template>
  <q-card class="widget-card full-height" :class="{ 'editing-mode': isEditing }">
    <!-- Header -->
    <div class="widget-header bg-grey-2">
      <div class="text-truncate">
        <q-icon :name="icon" size="sm" class="q-mr-xs" />
        {{ title }}
      </div>

      <div class="row items-center no-wrap widget-actions">
        <!-- Refresh button -->
        <q-btn
          v-if="!isEditing"
          flat
          dense
          round
          icon="refresh"
          size="sm"
          :loading="loading"
          @click="handleRefresh"
        >
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>

        <!-- Edit button -->
        <q-btn
          v-if="isEditing"
          flat
          dense
          round
          icon="edit"
          size="sm"
          @click="$emit('edit', widget)"
        >
          <q-tooltip>Edit</q-tooltip>
        </q-btn>

        <!-- Delete button -->
        <q-btn
          v-if="isEditing"
          flat
          dense
          round
          icon="delete"
          size="sm"
          color="negative"
          @click="handleDelete"
        >
          <q-tooltip>Delete</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Content -->
    <div class="widget-content relative-position">
      <!-- Loading overlay -->
      <div
        v-if="loading && !error"
        class="absolute-full flex flex-center"
        style="background: rgba(255,255,255,0.8);"
      >
        <q-spinner-dots size="40px" :color="$q.dark.isActive ? 'white' : 'primary'" />
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="flex flex-center column q-pa-md">
        <q-icon name="error" size="32px" color="negative" />
        <div class="text-subtitle2 text-negative q-mt-sm text-center">
          {{ errorMessage }}
        </div>
        <q-btn
          flat
          color="primary"
          label="Retry"
          size="sm"
          class="q-mt-sm"
          @click="handleRefresh"
        />
      </div>

      <!-- Slot for widget-specific content -->
      <slot v-else name="content" :data="data" :loading="loading"></slot>
    </div>

    <!-- Footer with last update time -->
    <q-card-actions v-if="lastUpdate" class="row items-center justify-end q-pa-xs">
      <div class="text-caption text-grey-7">
        Updated: {{ formattedLastUpdate }}
      </div>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import type { WidgetConfig, MetricOut } from '../../types'
import { formatTime } from '../../utils'

const $q = useQuasar()

// Props
const props = defineProps<{
  widget: WidgetConfig
  isEditing: boolean
  data?: MetricOut[] | MetricOut | null
  loading?: boolean
  error?: string | null
  icon?: string
}>()

// Emits
const emit = defineEmits<{
  edit: [widget: WidgetConfig]
  delete: [widgetId: string]
  refresh: []
}>()

// State
const lastUpdate = ref<number | null>(null)

// Computed
const title = computed(() => props.widget.title)
const errorMessage = computed(() => props.error || 'Failed to load data')

const formattedLastUpdate = computed(() => {
  if (!lastUpdate.value) return ''
  return formatTime(lastUpdate.value / 1000)
})

// Methods
function handleRefresh() {
  lastUpdate.value = Date.now()
  emit('refresh')
}

function handleDelete() {
  $q.dialog({
    title: 'Confirm Delete',
    message: `Are you sure you want to delete "${props.widget.title}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    emit('delete', props.widget.id)
  })
}

// Watch for data changes
watch(
  () => props.data,
  (newData) => {
    if (newData && !props.error) {
      lastUpdate.value = Date.now()
    }
  }
)

// Initialize last update on mount
onMounted(() => {
  if (props.data && !props.error) {
    lastUpdate.value = Date.now()
  }
})

// Cleanup
onUnmounted(() => {
  // Cleanup if needed
})
</script>

<style scoped lang="scss">
.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid var(--widget-border-light, #e0e0e0);

  .body--dark & {
    border-bottom-color: var(--widget-border-dark, #3D3D5C);
    background-color: var(--widget-header-dark, #363650);
  }
}

.editing-mode {
  cursor: move;
}
</style>
