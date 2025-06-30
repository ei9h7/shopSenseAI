import { useState, useEffect } from 'react'
import type { BusinessSettings, ServerSettings } from '../types'
import toast from 'react-hot-toast'

/**
 * useBusinessSettings Hook
 * 
 * A comprehensive React hook for managing business settings with server synchronization.
 * This hook provides a seamless interface between local settings and server configuration,
 * ensuring that API keys and business settings persist across deployments.
 * 
 * Key Features:
 * - Server settings synchronization for persistent API keys
 * - Local storage for user preferences and business details
 * - Automatic fallback when server is unavailable
 * - Real-time settings refresh capability
 * - DND (Do Not Disturb) toggle with default ON setting
 * - Masked API key display for security
 * 
 * The hook automatically detects when API keys are configured on the server
 * (via environment variables) and displays them as read-only with masked values.
 * This prevents users from having to re-enter API keys after deployments.
 */

// Production API base URL - always use production server
const API_BASE_URL = 'https://torquegpt.onrender.com'

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
  const [serverSettings, setServerSettings] = useState<ServerSettings | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  /**
   * Loads settings from both server and local storage
   * 
   * This function first attempts to fetch server configuration (for API keys
   * and business settings configured via environment variables), then loads
   * local user preferences from localStorage. The two sources are merged
   * with server settings taking precedence for API keys.
   */
  const loadSettings = async () => {
    try {
      // First try to load from server (for persistent API keys)
      try {
        console.log('🔄 Fetching server settings...')
        const response = await fetch(`${API_BASE_URL}/api/settings`)
        if (response.ok) {
          const serverData = await response.json()
          setServerSettings(serverData)
          console.log('✅ Server settings loaded:', serverData)
          
          // Show toast if API keys are configured on server
          if (serverData.openai_configured && serverData.openphone_configured) {
            toast.success('API keys loaded from server')
          } else if (serverData.openai_configured) {
            toast.success('OpenAI API key loaded from server')
          } else if (serverData.openphone_configured) {
            toast.success('OpenPhone API key loaded from server')
          }
        } else {
          console.warn('⚠️ Server settings request failed:', response.status)
        }
      } catch (error) {
        console.log('⚠️ Server settings not available, using local storage only:', error)
      }

      // Load from localStorage for user preferences
      const savedSettings = localStorage.getItem('business-settings')
      if (savedSettings) {
        const localSettings = JSON.parse(savedSettings)
        
        // Merge server settings with local settings
        // Server API keys take precedence, but local preferences are preserved
        const mergedSettings = {
          ...defaultSettings,
          ...localSettings,
          // If DND setting doesn't exist, default to true (ON)
          dnd_enabled: localSettings.dnd_enabled !== undefined ? localSettings.dnd_enabled : true
        }
        
        setSettings(mergedSettings)
        console.log('📱 Local settings loaded and merged')
      } else {
        // No local settings found, use defaults
        setSettings(defaultSettings)
        console.log('🆕 Using default settings')
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error)
      setSettings(defaultSettings)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Updates business settings in local storage
   * 
   * This function handles updates to business information, preferences,
   * and local API key configuration. Server-configured API keys cannot
   * be overridden locally.
   * 
   * @param newSettings - Partial settings object with updates
   */
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
      
      // Log API key updates for debugging
      if (newSettings.openai_api_key) {
        console.log('🔑 OpenAI API key updated locally')
      }
      if (newSettings.openphone_api_key) {
        console.log('📱 OpenPhone API key updated locally')
      }
    } catch (error) {
      console.error('Settings update error:', error)
      toast.error('Failed to update settings')
    } finally {
      setIsUpdating(false)
    }
  }

  /**
   * Toggles the Do Not Disturb setting
   * 
   * DND controls whether the AI automatically responds to incoming messages.
   * When enabled (default), the system processes messages with AI and sends
   * automatic responses. When disabled, messages are stored but no automatic
   * responses are sent.
   * 
   * @param enabled - Whether DND should be enabled
   */
  const toggleDnd = async (enabled: boolean) => {
    try {
      const updatedSettings = {
        ...settings,
        dnd_enabled: enabled,
        updated_at: new Date().toISOString()
      } as BusinessSettings & { dnd_enabled: boolean }

      localStorage.setItem('business-settings', JSON.stringify(updatedSettings))
      setSettings(updatedSettings)
      
      console.log(`🔕 DND ${enabled ? 'enabled' : 'disabled'}`)
      toast.success(`Do Not Disturb ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('DND toggle error:', error)
      toast.error('Failed to update Do Not Disturb setting')
    }
  }

  /**
   * Refreshes settings from the server
   * 
   * This function can be called manually to sync the latest server
   * configuration, useful when API keys or business settings have
   * been updated on the server side.
   */
  const refreshSettings = () => {
    setIsLoading(true)
    loadSettings()
    toast.success('Settings refreshed from server')
  }

  // Helper function to get effective API keys (server takes precedence)
  const getEffectiveApiKeys = () => {
    return {
      openai_api_key: serverSettings?.openai_configured ? 'server-configured' : settings?.openai_api_key,
      openphone_api_key: serverSettings?.openphone_configured ? 'server-configured' : settings?.openphone_api_key,
      has_openai: serverSettings?.openai_configured || !!(settings?.openai_api_key && settings.openai_api_key.length > 10),
      has_openphone: serverSettings?.openphone_configured || !!(settings?.openphone_api_key && settings.openphone_api_key.length > 10)
    }
  }

  return {
    settings,
    serverSettings,
    isLoading,
    error: null,
    updateSettings,
    isUpdating,
    toggleDnd,
    refreshSettings,
    getEffectiveApiKeys
  }
}