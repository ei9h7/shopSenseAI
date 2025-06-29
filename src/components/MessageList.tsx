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
    if (!selectedMessage || !replyText.trim()) return

    try {
      await sendMessage({
        phoneNumber: selectedMessage.phone_number,
        message: replyText
      })
      setReplyText('')
      toast.success('Reply sent successfully')
    } catch (error) {
      toast.error('Failed to send reply')
    }
  }

  const handleCallCustomer = (phoneNumber: string) => {
    // Open phone dialer
    window.open(`tel:${phoneNumber}`)
  }

  return (
    <div className="flex h-96">
      {/* Message List */}
      <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
        <div className="space-y-2 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              onClick={() => handleMessageClick(message)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedMessage?.id === message.id
                  ? 'bg-primary-50 border-primary-200'
                  : message.direction === 'inbound' 
                    ? 'bg-white border-gray-200 hover:bg-gray-50' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              } ${
                message.direction === 'inbound' && !message.read ? 'font-medium' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <div className={`flex-shrink-0 ${
                    message.direction === 'inbound' ? 'text-gray-600' : 'text-primary-600'
                  }`}>
                    {message.direction === 'inbound' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {message.phone_number}
                      </span>
                      {message.intent && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getIntentColor(message.intent)}`}>
                          {message.intent}
                        </span>
                      )}
                      {message.intent?.toLowerCase().includes('emergency') && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                      {message.direction === 'inbound' && !message.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 truncate">{message.body}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Detail */}
      <div className="w-1/2 flex flex-col">
        {selectedMessage ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedMessage.phone_number}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {format(new Date(selectedMessage.timestamp), 'MMMM d, yyyy at h:mm a')}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleCallCustomer(selectedMessage.phone_number)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </button>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className={`p-4 rounded-lg ${
                selectedMessage.direction === 'inbound' 
                  ? 'bg-white border border-gray-200' 
                  : 'bg-primary-50 border border-primary-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${
                    selectedMessage.direction === 'inbound' ? 'text-gray-600' : 'text-primary-600'
                  }`}>
                    {selectedMessage.direction === 'inbound' ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <Bot className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedMessage.body}
                    </p>
                    {selectedMessage.action && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
                          <strong>Action Required:</strong> {selectedMessage.action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reply Section */}
            {selectedMessage.direction === 'inbound' && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                    rows={2}
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || isSending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <Reply className="h-4 w-4 mr-1" />
                    {isSending ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm">Select a message to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageList