<script setup lang="ts">
import { onMounted, computed, h, ref } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import { useQuasar } from 'quasar'
import { useDashboardStore, WIDGET_MIN_SIZES } from 'stores/dashboard'
import { useUIStore } from 'stores/ui'
import NumberWidget from 'components/widgets/NumberWidget.vue'
import ChartWidget from 'components/widgets/ChartWidget.vue'
import GridContainerWidget from 'components/widgets/GridContainerWidget.vue'

const $q = useQuasar()
const dashboardStore = useDashboardStore()
const uiStore = useUIStore()

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')
const isEditMode = computed(() => uiStore.isEditMode)
const gridOptions = computed(() => dashboardStore.gridOptions)

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

function getMinWidth(widget: any): number {
  if (!widget) return 2
  return WIDGET_MIN_SIZES[widget.type]?.minW || 2
}

function getMinHeight(widget: any): number {
  if (!widget) return 2
  return WIDGET_MIN_SIZES[widget.type]?.minH || 2
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
        widget.childLayout = newLayout
      },
      'onUpdate:children': (newChildren: any[]) => {
        widget.children = newChildren
      }
    })
  }

  return null
}

function removeWidget(widgetId: string) {
  dashboardStore.removeWidget(widgetId)
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
          :min-w="item.minW || getMinWidth(getWidget(item.i))"
          :min-h="item.minH || getMinHeight(getWidget(item.i))"
          :i="item.i"
          :static="!isEditMode"
          @resize="resizeEvent"
          @move="moveEvent"
          @resized="resizedEvent"
          @moved="movedEvent"
        >
          <div class="widget-wrapper">
            <component :is="renderWidget(getWidget(item.i))" />
            <div v-if="isEditMode && getWidget(item.i)?.type !== 'gridContainer'" class="widget-delete">
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

.widget-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
}
</style>
