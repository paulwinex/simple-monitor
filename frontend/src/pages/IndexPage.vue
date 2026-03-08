<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import Widget from 'components/widgets/Widget.vue'
import { useDashboardStore } from 'stores/dashboard'

const dashboardStore = useDashboardStore()

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
</script>

<template>
  <q-page class="q-pa-md">
<!--    <div class="text-h4 q-mb-md">Dashboard</div>-->
    <div v-if="dashboardStore.isLoading" class="row justify-center q-mt-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="dashboardStore.hasError" class="row justify-center q-mt-xl">
      <q-banner class="bg-negative text-white">
        {{ dashboardStore.error }}
      </q-banner>
    </div>

    <div v-else class="dashboard-grid">
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
          <Widget :title="item.title">
            <template #content>
              <div class="text-center">
                <div class="text-h3">{{ item.i }}</div>
              </div>
            </template>
          </Widget>
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

.vue-grid-item:not(.vue-grid-placeholder) {
  background: var(--q-secondary);
  border: 1px solid var(--q-border-color);
  border-radius: 4px;
}

.vue-grid-item.static {
  background: var(--q-primary);
}

.vue-grid-item .vue-resizable-handle {
  z-index: 10;
}
</style>
