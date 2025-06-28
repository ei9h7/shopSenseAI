import React from 'react'
import { format } from 'date-fns'
import { MessageSquare, Bot, User, AlertTriangle } from 'lucide-react'
import { useMessages } from '../hooks/useMessages'
import type { Message } from '../types'

const MessageList: React.FC = () => {
  const { messages, isLoading } = useMessages()

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
          Customer messages will appear here when you connect your communication channels.
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

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`p-4 rounded-lg border ${
            message.direction === 'inbound' 
              ? 'bg-white border-gray-200' 
              : 'bg-primary-50 border-primary-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 ${
                message.direction === 'inbound' ? 'text-gray-600' : 'text-primary-600'
              }`}>
                {message.direction === 'inbound' ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Bot className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {message.phone_number}
                  </span>
                  {message.intent && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getIntentColor(message.intent)}`}>
                      {message.intent}
                    </span>
                  )}
                  {message.intent?.toLowerCase().includes('emergency') && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-sm text-gray-700 mb-2">{message.body}</p>
                {message.action && (
                  <p className="text-xs text-gray-500">
                    <strong>Action:</strong> {message.action}
                  </p>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {format(new Date(message.timestamp), 'MMM d, h:mm a')}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MessageList