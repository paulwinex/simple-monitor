<script setup lang="ts">
import { onMounted, computed, h, ref } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import { useQuasar } from 'quasar'
import { useDashboardStore } from 'stores/dashboard'
import { useUIStore } from 'stores/ui'
import NumberWidget from 'components/widgets/NumberWidget.vue'
import ChartWidget from 'components/widgets/ChartWidget.vue'
import GridContainerWidget from 'components/widgets/GridContainerWidget.vue'
import EditWidgetDialog from 'components/widgets/EditWidgetDialog.vue'
import type { WidgetConfig } from 'src/components/models'

const $q = useQuasar()
const dashboardStore = useDashboardStore()
const uiStore = useUIStore()

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')
const isEditMode = computed(() => uiStore.isEditMode)
const gridOptions = computed(() => dashboardStore.gridOptions)

const showEditWidget = ref(false)
const editingWidget = ref<WidgetConfig | null>(null)

onMounted(() => {
  dashboardStore.loadDashboard()
})

function moveEvent(i: string, newX: number, newY: number) {
  console.info(`MOVE i=${i}, X=${newX}, Y=${newY}`)
}

function movedEvent(i: string, newX: number, newY: number) {
  console.info(`MOVED i=${i}, X=${newX}, Y=${newY}`)
}

function resizeEvent(i: string, newH: number, newW: number, newHPx: number, newWPx: number) {
  console.info(`RESIZE i=${i}, H=${newH}, W=${newW}, H(px)=${newHPx}, W(px)=${newWPx}`)
}

function resizedEvent(i: string, newX: number, newY: number, newHPx: number, newWPx: number) {
  console.info(`RESIZED i=${i}, X=${newX}, Y=${newY}, H(px)=${newHPx}, W(px)=${newWPx}`)
}

function layoutUpdatedEvent(newLayout: any[]) {
  dashboardStore.updateLayout(newLayout)
  console.info('Updated layout')
}

function getWidget(id: string) {
  return dashboardStore.widgets.find(w => w.id === id)
}

function renderWidget(widget: any) {
  if (!widget) return null

  const commonProps = {
    title: widget.title,
    showHeader: !!widget.title,
    options: widget.options,
    loading: false,
    error: null
  }

  if (widget.type === 'number') {
    return h(NumberWidget, {
      ...commonProps,
      value: widget.data?.value ?? null
    })
  }

  if (widget.type === 'chart') {
    return h(ChartWidget, {
      ...commonProps,
      data: widget.data?.data ?? []
    })
  }

  if (widget.type === 'gridContainer') {
    return h(GridContainerWidget, {
      title: widget.title,
      containerId: widget.id,
      children: widget.children || [],
      childLayout: widget.childLayout || [],
      isEditing: isEditMode.value,
      showHeader: !!widget.title,
      'onUpdate:layout': (newLayout: any[]) => {
        console.log('[IndexPage] GridContainer layout updated:', newLayout)
        widget.childLayout = newLayout
      },
      'onUpdate:children': (newChildren: any[]) => {
        console.log('[IndexPage] GridContainer children updated:', newChildren)
        widget.children = newChildren
      },
      'onEdit-container': (containerId: string) => {
        console.log('[IndexPage] Edit container:', containerId)
        openEditWidget(containerId)
      },
      'onRemove-container': (containerId: string) => {
        console.log('[IndexPage] Remove container:', containerId)
        removeWidget(containerId)
      }
    })
  }

  return null
}

function removeWidget(widgetId: string) {
  dashboardStore.removeWidget(widgetId)
}

function openEditWidget(widgetId: string) {
  const widget = getWidget(widgetId)
  if (widget) {
    editingWidget.value = { ...widget }
    showEditWidget.value = true
  }
}

function updateWidget(updatedWidget: WidgetConfig) {
  dashboardStore.updateWidget(updatedWidget.id, updatedWidget)
  dashboardStore.saveDashboard()
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-space />
    </div>

    <div v-if="dashboardStore.isLoading" class="row justify-center q-mt-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="dashboardStore.hasError" class="row justify-center q-mt-xl">
      <q-banner class="bg-negative text-white">
        {{ dashboardStore.error }}
      </q-banner>
    </div>

    <div v-else :class="['dashboard-grid', { 'vue-grid-layout-light': !isDark }]">
      <GridLayout
        v-model:layout="dashboardStore.layout"
        :col-num="gridOptions.colNum"
        :row-height="gridOptions.rowHeight"
        :is-draggable="isEditMode"
        :is-resizable="isEditMode"
        :vertical-compact="gridOptions.verticalCompact"
        :use-css-transforms="true"
        @layout-updated="layoutUpdatedEvent"
      >
        <GridItem
          v-for="item in dashboardStore.layout"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
          :static="!isEditMode"
          @resize="resizeEvent"
          @move="moveEvent"
          @resized="resizedEvent"
          @moved="movedEvent"
        >
          <div class="widget-wrapper">
            <component :is="renderWidget(getWidget(item.i))" />
            <div v-if="isEditMode && getWidget(item.i)?.type !== 'gridContainer'" class="widget-actions">
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="edit"
                @click.stop="openEditWidget(item.i)"
              />
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="close"
                @click.stop="removeWidget(item.i)"
              />
            </div>
          </div>
        </GridItem>
      </GridLayout>
    </div>

    <!-- Edit Widget Dialog -->
    <EditWidgetDialog
      v-model="showEditWidget"
      :widget="editingWidget"
      @update:widget="updateWidget"
    />
  </q-page>
</template>

<style scoped>
.dashboard-grid {
  background: var(--q-card-background);
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
  position: relative;
}

.vue-grid-layout {
  background: transparent;
}

/* Dark theme */
.vue-grid-item:not(.vue-grid-placeholder) {
  background: #424242;
  border: 1px solid #616161;
  border-radius: 4px;
}

.vue-grid-item.static {
  background: #545454;
}

/* Light theme */
.vue-grid-layout-light .vue-grid-item:not(.vue-grid-placeholder) {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.vue-grid-layout-light .vue-grid-item.static {
  background: #f5f5f5;
}

.vue-grid-item .vue-resizable-handle {
  z-index: 10;
}

/* Отключаем выделение текста при ресайзе */
.vue-grid-item * {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.widget-wrapper {
  height: 100%;
  position: relative;
}

.widget-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 100;
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50px;
  padding: 4px;
}

.widget-actions .q-btn {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.widget-actions .q-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
