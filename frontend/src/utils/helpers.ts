import { format, subHours, subDays } from 'date-fns'

/**
 * Format timestamp to readable date string
 */
export function formatTimestamp(timestamp: number, formatStr = 'yyyy-MM-dd HH:mm:ss'): string {
  return format(new Date(timestamp * 1000), formatStr)
}

/**
 * Format timestamp to short time string
 */
export function formatTime(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'HH:mm')
}

/**
 * Get time range in seconds based on preset
 */
export function getTimeRangeSeconds(range: '1h' | '6h' | '24h' | '7d'): { start: number; end: number } {
  const end = Math.floor(Date.now() / 1000)
  let start: number

  switch (range) {
    case '1h':
      start = subHours(new Date(), 1).getTime() / 1000
      break
    case '6h':
      start = subHours(new Date(), 6).getTime() / 1000
      break
    case '24h':
      start = subHours(new Date(), 24).getTime() / 1000
      break
    case '7d':
      start = subDays(new Date(), 7).getTime() / 1000
      break
  }

  return { start, end }
}

/**
 * Format number with specified decimals
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
