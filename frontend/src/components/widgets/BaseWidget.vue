<template>
  <div class="widget-container">
    <div v-if="showHeader" class="widget-header">
      <slot name="title">
        <span class="widget-title">{{ title }}</span>
      </slot>
    </div>
    <div class="widget-content" ref="contentRef">
      <slot name="content"></slot>
      
      <!-- Label overlay -->
      <div
        v-if="labelEnabled && labelText"
        class="widget-label"
        :style="labelStyle"
      >
        {{ labelText }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  labelEnabled: {
    type: Boolean,
    default: false
  },
  labelText: {
    type: String,
    default: ''
  },
  labelFontSize: {
    type: [Number, String],
    default: 14
  },
  labelVerticalAlign: {
    type: String,
    default: 'bottom',
    validator: (value) => ['top', 'center', 'bottom'].includes(value)
  },
  labelHorizontalAlign: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'center', 'right'].includes(value)
  },
  labelPadding: {
    type: Number,
    default: 8
  },
  labelColor: {
    type: String,
    default: '#ffffff'
  }
})

const showHeader = computed(() => !!props.title)
const contentRef = ref(null)

// Compute label position and style
const labelStyle = computed(() => {
  const style = {
    fontSize: typeof props.labelFontSize === 'number'
      ? `${props.labelFontSize}px`
      : props.labelFontSize,
    color: props.labelColor
  }

  // Set vertical position
  if (props.labelVerticalAlign === 'top') {
    style.top = `${props.labelPadding}px`
  } else if (props.labelVerticalAlign === 'center') {
    style.top = '50%'
    style.transform = 'translateY(-50%)'
  } else { // bottom
    style.bottom = `${props.labelPadding}px`
  }

  // Set horizontal position
  if (props.labelHorizontalAlign === 'left') {
    style.left = `${props.labelPadding}px`
  } else if (props.labelHorizontalAlign === 'center') {
    style.left = '50%'
    // Combine with existing transform if present
    const existingTransform = style.transform || ''
    style.transform = existingTransform
      ? `${existingTransform} translateX(-50%)`
      : 'translateX(-50%)'
  } else { // right
    style.right = `${props.labelPadding}px`
  }

  return style
})
</script>

<style scoped>
.widget-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: var(--sm-widget-radius, 4px);
  overflow: hidden;
  background: var(--sm-widget-bg, #ffffff);
  border: var(--sm-widget-border-width, 1px) var(--sm-widget-border-style, solid)
    var(--sm-widget-border-color, #e0e0e0);
  box-shadow: var(--sm-widget-shadow, 0 1px 3px 0 rgba(0, 0, 0, 0.12));
  color: var(--sm-app-text, #333333);
  font-family: var(--sm-font-family, Roboto, 'Segoe UI', sans-serif);
  font-size: var(--sm-font-size, 13px);
  font-weight: var(--sm-font-weight, 400);
}

.widget-header {
  display: flex;
  justify-content: var(--sm-header-align, left);
  align-items: center;
  height: var(--sm-header-height, auto);
  padding: var(--sm-header-padding-y, 8px) var(--sm-header-padding-x, 12px);
  background: var(--sm-header-bg, #f5f5f5);
  border-bottom: var(--sm-widget-border-width, 1px) var(--sm-widget-border-style, solid)
    var(--sm-widget-border-color, #e0e0e0);
  flex-shrink: 0;
}

.widget-title {
  font-family: var(--sm-header-font-family, Roboto, 'Segoe UI', sans-serif);
  font-weight: var(--sm-header-font-weight, 600);
  font-size: var(--sm-header-font-size, 14px);
  letter-spacing: var(--sm-header-letter-spacing, 0);
  color: var(--sm-header-color, #424242);
  text-shadow: var(--sm-text-shadow, 0 1px 2px 0 rgba(0, 0, 0, 0.15));
}

.widget-content {
  flex: 1;
  padding: 4px;
  overflow: hidden;
  position: relative;
  color: var(--sm-app-text, #333333);
}

.widget-label {
  position: absolute;
  pointer-events: none;
  z-index: 1000;
  font-weight: 600;
  white-space: nowrap;
  text-shadow: var(--sm-text-shadow, 0 1px 2px 0 rgba(0, 0, 0, 0.15));
}
</style>
