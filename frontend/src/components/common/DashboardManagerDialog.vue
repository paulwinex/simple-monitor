<template>
  <q-dialog v-model="visible">
    <q-card class="dashboard-manager-card">
      <q-card-section class="dashboard-manager-header row items-center no-wrap q-pb-none">
        <div class="text-h6 ellipsis">Open Dashboard</div>
        <q-space />
        <q-btn flat round dense icon="close" aria-label="Close" @click="close" />
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <q-input
          v-model="search"
          dense
          outlined
          clearable
          debounce="200"
          placeholder="Search dashboards..."
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>

        <div class="q-mt-md dashboard-list column q-gutter-xs" :style="{ maxHeight: '360px' }">
          <q-item
            v-for="d in filteredDashboards"
            :key="d.id"
            clickable
            v-ripple
            :active="d.id === currentId"
            active-class="text-primary"
            @click="selectDashboard(d)"
          >
            <q-item-section>
              <q-item-label>{{ d.name }}</q-item-label>
              <q-item-label caption>
                {{ d.id === currentId ? 'Current' : `#${d.id}` }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon v-if="d.id === currentId" name="check" color="primary" />
              <q-btn
                round
                flat
                dense
                icon="delete"
                aria-label="Delete dashboard"
                @click.stop="requestDelete(d)"
              />
            </q-item-section>
          </q-item>

          <div v-if="filteredDashboards.length === 0" class="text-center text-grey-6 q-py-lg">
            No dashboards found
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Close" color="primary" @click="close" />
        <q-btn flat label="New Dashboard" icon="add" color="primary" @click="showCreate = true" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Create dashboard name prompt -->
  <q-dialog v-model="showCreate">
    <q-card style="min-width: 340px">
      <q-card-section class="row items-center">
        <q-icon name="dashboard" size="sm" class="q-mr-sm" />
        <div class="text-h6">New Dashboard</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input
          v-model="newName"
          autofocus
          dense
          outlined
          label="Dashboard name"
          :rules="[(val) => (val && val.trim().length > 0) || 'Enter a name']"
          @keyup.enter="submitCreate"
        />
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Create" color="primary" @click="submitCreate" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Delete confirmation -->
  <q-dialog v-model="showDeleteConfirm">
    <q-card style="min-width: 360px">
      <q-card-section class="row items-center">
        <q-icon name="warning" size="sm" color="negative" class="q-mr-sm" />
        <div class="text-h6">Delete Dashboard?</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        &ldquo;{{ deleteTarget?.name }}&rdquo; will be permanently deleted.
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Delete" color="negative" @click="submitDelete" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import { getDashboardMeta } from 'src/services/api'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select', 'create', 'delete'])

const dashboardStore = useDashboardStore()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const dashboards = ref([])
const search = ref('')
const showCreate = ref(false)
const newName = ref('')
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)

const currentId = computed(() => dashboardStore.currentDashboardId)

const filteredDashboards = computed(() => {
  const query = search.value.trim().toLowerCase()
  const sorted = [...dashboards.value].sort((a, b) => a.id - b.id)
  if (!query) return sorted
  return sorted.filter((d) => (d.name || '').toLowerCase().includes(query))
})

async function refresh() {
  try {
    dashboards.value = await getDashboardMeta()
  } catch (err) {
    console.error('Failed to load dashboards list:', err)
    dashboards.value = []
  }
}

// Load the list every time the dialog opens.
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) refresh()
  }
)

function close() {
  visible.value = false
}

function selectDashboard(d) {
  if (d.id === currentId.value) {
    close()
    return
  }
  emit('select', { id: d.id, name: d.name })
}

function submitCreate() {
  const name = newName.value.trim()
  if (!name) return
  showCreate.value = false
  newName.value = ''
  emit('create', name)
}

function requestDelete(d) {
  deleteTarget.value = d
  showDeleteConfirm.value = true
}

function submitDelete() {
  const target = deleteTarget.value
  deleteTarget.value = null
  showDeleteConfirm.value = false
  if (target) {
    emit('delete', { id: target.id, name: target.name })
  }
}

defineExpose({ refresh })
</script>

<style scoped>
.dashboard-manager-card {
  width: 560px;
  max-width: 90vw;
}

.dashboard-manager-header {
  min-height: 48px;
  padding-bottom: 10px !important;
  background: rgba(128, 128, 128, 0.14);
  border-bottom: 1px solid rgba(128, 128, 128, 0.22);
}

.dashboard-list {
  overflow-y: auto;
}
</style>