import { useState, useEffect } from 'react'
import type { Message } from '../types'

// Mock messages data
const mockMessages: Message[] = [
  {
    id: '1',
    phone_number: '+1234567890',
    body: 'Hi, my car is making a strange noise when I brake. Can you take a look?',
    direction: 'inbound',
    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    processed: true,
    ai_response: 'Thanks for reaching out! Brake noise can indicate several issues. I can take a look - would you like to schedule an inspection? My rate is $80/hr with a 1-hour minimum.',
    intent: 'Service Request',
    action: 'Quote provided',
    created_at: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: '2',
    phone_number: '+1234567890',
    body: 'Thanks for reaching out! Brake noise can indicate several issues. I can take a look - would you like to schedule an inspection? My rate is $80/hr with a 1-hour minimum.',
    direction: 'outbound',
    timestamp: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
    processed: true,
    created_at: new Date(Date.now() - 240000).toISOString()
  },
  {
    id: '3',
    phone_number: '+1987654321',
    body: 'EMERGENCY! My car broke down on Highway 1. Engine is smoking!',
    direction: 'inbound',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    processed: true,
    ai_response: 'This sounds like an emergency! Please pull over safely and turn off the engine immediately. I can arrange emergency roadside assistance. Are you in a safe location?',
    intent: 'Emergency',
    action: 'Emergency response sent',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
]

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    // Load messages from localStorage or use mock data
    const savedMessages = localStorage.getItem('messages')
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages))
    } else {
      setMessages(mockMessages)
      localStorage.setItem('messages', JSON.stringify(mockMessages))
    }
    setIsLoading(false)
  }, [])

  const sendMessage = async ({ phoneNumber, message }: { phoneNumber: string; message: string }) => {
    setIsSending(true)
    try {
      const newMessage: Message = {
        id: Date.now().toString(),
        phone_number: phoneNumber,
        body: message,
        direction: 'inbound',
        timestamp: new Date().toISOString(),
        processed: false,
        created_at: new Date().toISOString()
      }

      const updatedMessages = [newMessage, ...messages]
      setMessages(updatedMessages)
      localStorage.setItem('messages', JSON.stringify(updatedMessages))
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  return {
    messages,
    isLoading,
    error: null,
    sendMessage,
    isSending
  }
}