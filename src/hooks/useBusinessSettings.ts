import { useState, useEffect } from 'react'
import type { BusinessSettings } from '../types'
import toast from 'react-hot-toast'

// Default settings with DND enabled by default (as per recent changes)
const defaultSettings: BusinessSettings = {
  id: '1',
  business_name: 'Pink Chicken Speed Shop',
  labor_rate: 80,
  phone_number: '',
  business_number: '',
  gst_setting: 'parts',
  openai_api_key: '',
  openphone_api_key: '',
  dnd_enabled: true, // Default to ON as per recent changes
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export const useBusinessSettings = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [serverSettings, setServerSettings] = useState<any>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // First try to load from server (for persistent API keys)
      try {
        const response = await fetch('https://torquegpt.onrender.com/api/settings')
        if (response.ok) {
          const serverData = await response.json()
          setServerSettings(serverData)
        }
      } catch (error) {
        console.log('Server settings not available, using local storage')
      }

      // Load from localStorage
      const savedSettings = localStorage.getItem('business-settings')
      if (savedSettings) {
        const localSettings = JSON.parse(savedSettings)
        
        // Merge server settings with local settings
        const mergedSettings = {
          ...defaultSettings,
          ...localSettings,
          // If DND setting doesn't exist, default to true (ON)
          dnd_enabled: localSettings.dnd_enabled !== undefined ? localSettings.dnd_enabled : true
        }
        
        setSettings(mergedSettings)
      } else {
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setSettings(defaultSettings)
    } finally {
      setIsLoading(false)
    }
  }

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
      
      toast.success(`Do Not Disturb ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('DND toggle error:', error)
      toast.error('Failed to update Do Not Disturb setting')
    }
  }

  const refreshSettings = () => {
    loadSettings()
  }

  return {
    settings,
    serverSettings,
    isLoading,
    error: null,
    updateSettings,
    isUpdating,
    toggleDnd,
    refreshSettings
  }
}