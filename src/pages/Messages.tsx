import React, { useEffect } from 'react'
import { MessageSquare, RefreshCw } from 'lucide-react'
import MessageList from '../components/MessageList'
import { useMessages } from '../hooks/useMessages'
import { useBusinessSettings } from '../hooks/useBusinessSettings'

const Messages: React.FC = () => {
  const { refreshMessages, getUnreadCount, getEmergencyMessages } = useMessages()
  const { settings } = useBusinessSettings()
  
  const unreadCount = getUnreadCount()
  const emergencyMessages = getEmergencyMessages()

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Show notifications for emergency messages
  useEffect(() => {
    if (emergencyMessages.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      emergencyMessages.forEach(msg => {
        if (!msg.notified) {
          new Notification('🚨 Emergency Message Received!', {
            body: `From ${msg.phone_number}: ${msg.body.substring(0, 100)}...`,
            icon: '/wrench.svg',
            tag: msg.id
          })
          // Mark as notified to prevent duplicate notifications
          msg.notified = true
        }
      })
    }
  }, [emergencyMessages])

  const hasApiKeys = settings?.openai_api_key && settings?.openphone_api_key

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {unreadCount} unread
              </span>
            )}
            {emergencyMessages.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                🚨 {emergencyMessages.length} emergency
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage all customer communications in one place
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={refreshMessages}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {!hasApiKeys && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                API Configuration Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  To receive and respond to messages, please configure your API keys in the{' '}
                  <a href="/settings" className="font-medium underline">
                    Settings page
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <MessageList />
        </div>
      </div>
    </div>
  )
}

export default Messages