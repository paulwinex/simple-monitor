import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { hosts, devices } from '../api'
import type { HostWithDevices, DeviceWithMetrics } from '../types'

export const useHostsStore = defineStore('hosts', () => {
  // State
  const hosts = ref<HostWithDevices[]>([])
  const devicesWithMetrics = ref<Map<string, DeviceWithMetrics[]>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hostOptions = computed(() => {
    return hosts.value.map((h) => ({
      value: h.host_id,
      label: h.host_id,
    }))
  })

  const getDevicesForHost = computed(() => {
    return (hostId: string) => devicesWithMetrics.value.get(hostId) || []
  })

  // Actions
  async function fetchHosts() {
    loading.value = true
    error.value = null
    try {
      hosts.value = await hosts.list()
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch hosts'
      console.error('Failed to fetch hosts:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchDevices(hostId: string) {
    loading.value = true
    error.value = null
    try {
      const deviceList = await devices.listWithMetrics(hostId)
      devicesWithMetrics.value.set(hostId, deviceList)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch devices'
      console.error('Failed to fetch devices:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchAllDevices() {
    const promises = hosts.value.map((host) => fetchDevices(host.host_id))
    await Promise.all(promises)
  }

  function getDeviceMetrics(hostId: string, deviceId: string): string[] {
    const deviceList = devicesWithMetrics.value.get(hostId)
    const device = deviceList?.find((d) => d.name === deviceId)
    return device?.metrics || []
  }

  function clearHosts() {
    hosts.value = []
    devicesWithMetrics.value.clear()
    error.value = null
  }

  return {
    // State
    hosts,
    devicesWithMetrics,
    loading,
    error,
    // Computed
    hostOptions,
    getDevicesForHost,
    // Actions
    fetchHosts,
    fetchDevices,
    fetchAllDevices,
    getDeviceMetrics,
    clearHosts,
  }
})
