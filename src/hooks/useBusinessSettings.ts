import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import type { BusinessSettings } from '../types'
import toast from 'react-hot-toast'

export const useBusinessSettings = () => {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: ['business-settings'],
    queryFn: async (): Promise<BusinessSettings | null> => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    }
  })

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<BusinessSettings>) => {
      const { data, error } = await supabase
        .from('business_settings')
        .upsert(settings)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings'] })
      toast.success('Settings updated successfully')
    },
    onError: (error) => {
      console.error('Settings update error:', error)
      toast.error('Failed to update settings')
    }
  })

  const toggleDndMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('business_settings')
        .upsert({ dnd_enabled: enabled })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings'] })
    }
  })

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    toggleDnd: toggleDndMutation.mutate
  }
}