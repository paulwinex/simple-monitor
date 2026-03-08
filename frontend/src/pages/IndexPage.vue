<script setup lang="ts">
import { onMounted, computed, h } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import { useQuasar } from 'quasar'
import { useDashboardStore } from 'stores/dashboard'
import NumberWidget from 'components/widgets/NumberWidget.vue'
import ChartWidget from 'components/widgets/ChartWidget.vue'

const $q = useQuasar()
const dashboardStore = useDashboardStore()

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')
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
  
  return null
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Dashboard</div>
    
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
        :is-draggable="true"
        :is-resizable="true"
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
          @resize="resizeEvent"
          @move="moveEvent"
          @resized="resizedEvent"
          @moved="movedEvent"
        >
          <component :is="renderWidget(getWidget(item.i))" />
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
</style>
