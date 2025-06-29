import { useState, useEffect } from 'react'
import type { Message } from '../types'

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

  const loadMessages = () => {
    try {
      const savedMessages = localStorage.getItem('messages')
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages)
        setMessages(parsedMessages)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async ({ phoneNumber, message }: { phoneNumber: string; message: string }) => {
    setIsSending(true)
    try {
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
      
      // TODO: Actually send via OpenPhone API when implemented
      console.log('Message sent:', newMessage)
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    } finally {
      setIsSending(false)
    }
  }

  const markAsRead = (messageId: string) => {
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