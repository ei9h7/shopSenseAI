import { useState, useEffect } from 'react'
import type { Message } from '../types'
import toast from 'react-hot-toast'

/**
 * useMessages Hook
 * 
 * A comprehensive React hook for managing customer messages and SMS communication.
 * This hook provides real-time message management with the following capabilities:
 * 
 * - Automatic message polling from the production API
 * - SMS sending via OpenPhone integration
 * - Message status tracking (read/unread)
 * - Emergency message detection and filtering
 * - Real-time updates with 5-second polling interval
 * 
 * The hook connects directly to the production webhook server at torquegpt.onrender.com
 * and provides a seamless interface for message management in the frontend.
 */

// Production API base URL - always use production server
const API_BASE_URL = 'https://torquegpt.onrender.com'

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    loadMessages()
    
    // Set up polling to check for new messages every 5 seconds
    // This ensures real-time updates when new SMS messages arrive
    const interval = setInterval(loadMessages, 5000)
    
    return () => clearInterval(interval)
  }, [])

  /**
   * Loads messages from the production API
   * 
   * This function fetches messages from the server. If the server is unavailable,
   * messages will be set to an empty array.
   */
  const loadMessages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading messages from server:', error)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sends a manual SMS message to a customer
   * 
   * This function integrates with the OpenPhone API via the webhook server
   * to send SMS messages. It includes proper error handling and user feedback.
   * 
   * @param phoneNumber - The customer's phone number
   * @param message - The message content to send
   */
  const sendMessage = async ({ phoneNumber, message }: { phoneNumber: string; message: string }) => {
    setIsSending(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, message }),
      })

      if (response.ok) {
        // Refresh messages after sending to show the new outbound message
        await loadMessages()
        toast.success('Message sent successfully')
      } else {
        throw new Error('Server unavailable - unable to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      throw error
    } finally {
      setIsSending(false)
    }
  }

  /**
   * Marks a message as read
   * 
   * Updates the server to track message read status.
   * This helps with conversation management and unread count tracking.
   * 
   * @param messageId - The ID of the message to mark as read
   */
  const markAsRead = async (messageId: string) => {
    try {
      // Try to mark as read on server
      await fetch(`${API_BASE_URL}/api/messages/${messageId}/read`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Error marking message as read on server:', error)
    }

    // Update local state regardless of server response
    const updatedMessages = messages.map(msg => 
      msg.id === messageId ? { ...msg, read: true } : msg
    )
    setMessages(updatedMessages)
  }

  /**
   * Gets the count of unread inbound messages
   * 
   * Used for displaying notification badges and dashboard statistics.
   * Only counts inbound messages to avoid counting our own replies.
   */
  const getUnreadCount = () => {
    return messages.filter(msg => msg.direction === 'inbound' && !msg.read).length
  }

  /**
   * Filters messages to find emergency communications
   * 
   * Emergency messages are identified by their AI-detected intent
   * and are used for priority alerts and dashboard warnings.
   */
  const getEmergencyMessages = () => {
    return messages.filter(msg => 
      msg.intent?.toLowerCase().includes('emergency') && 
      msg.direction === 'inbound'
    )
  }

  return {
    messages,
    isLoading,
    error: null,
    sendMessage,
    isSending,
    markAsRead,
    getUnreadCount,
    getEmergencyMessages,
    refreshMessages: loadMessages
  }
}