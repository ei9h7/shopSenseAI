import React, { useState } from 'react'
import { format } from 'date-fns'
import { MessageSquare, Bot, User, AlertTriangle, Reply, Phone, Check } from 'lucide-react'
import { useMessages } from '../hooks/useMessages'
import { useBusinessSettings } from '../hooks/useBusinessSettings'
import type { Message } from '../types'
import toast from 'react-hot-toast'

const MessageList: React.FC = () => {
  const { messages, isLoading, sendMessage, isSending, markAsRead } = useMessages()
  const { settings } = useBusinessSettings()
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState('')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Customer messages will appear here when you receive SMS messages.
        </p>
      </div>
    )
  }

  const getIntentColor = (intent?: string) => {
    if (!intent) return 'bg-gray-100 text-gray-800'
    
    const lowerIntent = intent.toLowerCase()
    if (lowerIntent.includes('emergency')) return 'bg-red-100 text-red-800'
    if (lowerIntent.includes('quote')) return 'bg-blue-100 text-blue-800'
    if (lowerIntent.includes('booking')) return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message)
    if (message.direction === 'inbound' && !message.read) {
      markAsRead(message.id)
    }
  }

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) {
      toast.error('Please enter a message to send')
      return
    }

    try {
      await sendMessage({
        phoneNumber: selectedMessage.phone_number,
        message: replyText.trim()
      })
      setReplyText('')
      toast.success('Reply sent successfully!')
    } catch (error) {
      console.error('Reply error:', error)
      toast.error('Failed to send reply. Please try again.')
    }
  }

  const handleCallCustomer = (phoneNumber: string) => {
    // Open phone dialer
    window.open(`tel:${phoneNumber}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleReply()
    }
  }

  // Group messages by phone number for conversation view
  const groupedMessages = messages.reduce((groups, message) => {
    const phone = message.phone_number
    if (!groups[phone]) {
      groups[phone] = []
    }
    groups[phone].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  // Get the latest message for each conversation for the list view
  const conversations = Object.entries(groupedMessages).map(([phone, msgs]) => {
    const sortedMsgs = msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const latestMessage = sortedMsgs[0]
    const unreadCount = msgs.filter(m => m.direction === 'inbound' && !m.read).length
    const hasEmergency = msgs.some(m => m.intent?.toLowerCase().includes('emergency'))
    
    return {
      phone,
      latestMessage,
      unreadCount,
      hasEmergency,
      messages: sortedMsgs
    }
  }).sort((a, b) => new Date(b.latestMessage.timestamp).getTime() - new Date(a.latestMessage.timestamp).getTime())

  const selectedConversation = selectedMessage ? 
    conversations.find(c => c.phone === selectedMessage.phone_number) : null

  return (
    <div className="flex h-96">
      {/* Conversation List */}
      <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
        <div className="space-y-2 p-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.phone}
              onClick={() => handleMessageClick(conversation.latestMessage)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedMessage?.phone_number === conversation.phone
                  ? 'bg-primary-50 border-primary-200'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <div className="flex-shrink-0 text-gray-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {conversation.phone}
                      </span>
                      {conversation.latestMessage.intent && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getIntentColor(conversation.latestMessage.intent)}`}>
                          {conversation.latestMessage.intent}
                        </span>
                      )}
                      {conversation.hasEmergency && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 truncate">
                      {conversation.latestMessage.direction === 'outbound' ? 'You: ' : ''}
                      {conversation.latestMessage.body}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(conversation.latestMessage.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation Detail */}
      <div className="w-1/2 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedConversation.phone}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.messages.length} message{selectedConversation.messages.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleCallCustomer(selectedConversation.phone)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.direction === 'outbound'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex items-start space-x-2">
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                        <p className={`text-xs mt-1 ${
                          message.direction === 'outbound' ? 'text-primary-100' : 'text-gray-500'
                        }`}>
                          {format(new Date(message.timestamp), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    {message.action && message.direction === 'inbound' && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-gray-900">
                        <p className="text-xs">
                          <strong>Action:</strong> {message.action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Section */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your reply... (Press Enter to send, Shift+Enter for new line)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={2}
                  disabled={isSending}
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || isSending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Reply className="h-4 w-4 mr-1" />
                      Send
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your reply will be sent via SMS to {selectedConversation.phone}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm">Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageList