import { useState, useEffect } from 'react'
import type { BusinessSettings } from '../types'
import toast from 'react-hot-toast'

// Mock data for business settings
const defaultSettings: BusinessSettings = {
  id: '1',
  business_name: 'Pink Chicken Speed Shop',
  labor_rate: 80,
  phone_number: '',
  business_number: '',
  gst_setting: 'parts',
  openai_api_key: '',
  openphone_api_key: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export const useBusinessSettings = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('business-settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    } else {
      setSettings(defaultSettings)
    }
    setIsLoading(false)
  }, [])

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    setIsUpdating(true)
    try {
      const updatedSettings = {
        ...settings,
        ...newSettings,
        updated_at: new Date().toISOString()
      } as BusinessSettings

      localStorage.setItem('business-settings', JSON.stringify(updatedSettings))
      setSettings(updatedSettings)
      toast.success('Settings updated successfully')
    } catch (error) {
      console.error('Settings update error:', error)
      toast.error('Failed to update settings')
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleDnd = async (enabled: boolean) => {
    try {
      const updatedSettings = {
        ...settings,
        dnd_enabled: enabled,
        updated_at: new Date().toISOString()
      } as BusinessSettings & { dnd_enabled: boolean }

      localStorage.setItem('business-settings', JSON.stringify(updatedSettings))
      setSettings(updatedSettings)
    } catch (error) {
      console.error('DND toggle error:', error)
    }
  }

  return {
    settings,
    isLoading,
    error: null,
    updateSettings,
    isUpdating,
    toggleDnd
  }
}