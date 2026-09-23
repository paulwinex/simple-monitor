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
  border-radius: 4px;
  overflow: hidden;
  background: var(--widget-bg, #424242);
  border: 1px solid var(--widget-border, #616161);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--widget-header-bg, #545454);
  border-bottom: 1px solid var(--widget-header-border, #616161);
}

.widget-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--widget-title-color, #e0e0e0);
}

.widget-content {
  flex: 1;
  padding: 4px;
  overflow: hidden;
  position: relative;
  color: var(--widget-content-color, #bdbdbd);
}

.widget-label {
  position: absolute;
  pointer-events: none;
  z-index: 1000;
  font-weight: 600;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}
</style>
