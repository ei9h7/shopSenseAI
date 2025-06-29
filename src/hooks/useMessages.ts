import { useState, useEffect } from 'react'
import type { Message } from '../types'
import toast from 'react-hot-toast'

// Production API base URL (no more localhost)
const API_BASE_URL = 'https://torquegpt.onrender.com'

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    loadMessages()
    
    // Set up polling to check for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const loadMessages = async () => {
    try {
      // Try to load from server first
      const response = await fetch(`${API_BASE_URL}/api/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      } else {
        // Fallback to localStorage if server is unavailable
        const savedMessages = localStorage.getItem('messages')
        if (savedMessages) {
          setMessages(JSON.parse(savedMessages))
        } else {
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Error loading messages from server, using localStorage:', error)
      // Fallback to localStorage
      const savedMessages = localStorage.getItem('messages')
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages))
      } else {
        setMessages([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async ({ phoneNumber, message }: { phoneNumber: string; message: string }) => {
    setIsSending(true)
    try {
      // Send via production server
      const response = await fetch(`${API_BASE_URL}/api/messages/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, message }),
      })

      if (response.ok) {
        // Refresh messages after sending
        await loadMessages()
        toast.success('Message sent successfully')
      } else {
        // Fallback: just add to localStorage
        const newMessage: Message = {
          id: Date.now().toString(),
          phone_number: phoneNumber,
          body: message,
          direction: 'outbound',
          timestamp: new Date().toISOString(),
          processed: true,
          created_at: new Date().toISOString()
        }

        const updatedMessages = [newMessage, ...messages]
        setMessages(updatedMessages)
        localStorage.setItem('messages', JSON.stringify(updatedMessages))
        
        throw new Error('Server unavailable - message saved locally only')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      throw error
    } finally {
      setIsSending(false)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      // Try to mark as read on server
      await fetch(`${API_BASE_URL}/api/messages/${messageId}/read`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Error marking message as read on server:', error)
    }

    // Update local state regardless
    const updatedMessages = messages.map(msg => 
      msg.id === messageId ? { ...msg, read: true } : msg
    )
    setMessages(updatedMessages)
    localStorage.setItem('messages', JSON.stringify(updatedMessages))
  }

  const getUnreadCount = () => {
    return messages.filter(msg => msg.direction === 'inbound' && !msg.read).length
  }

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