import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { messageProcessor } from '../services/messageProcessor'
import type { Message } from '../types'

export const useMessages = () => {
  const queryClient = useQueryClient()

  const messagesQuery = useQuery({
    queryKey: ['messages'],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data || []
    }
  })

  const sendMessageMutation = useMutation({
    mutationFn: async ({ phoneNumber, message }: { phoneNumber: string; message: string }) => {
      await messageProcessor.processIncomingMessage(phoneNumber, message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
  })

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending
  }
}