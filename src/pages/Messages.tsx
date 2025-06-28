import React, { useEffect } from 'react'
import { MessageSquare, Settings } from 'lucide-react'
import MessageList from '../components/MessageList'
import { messageProcessor } from '../services/messageProcessor'

const Messages: React.FC = () => {
  useEffect(() => {
    // Initialize message processor when component mounts
    messageProcessor.initialize()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all customer communications in one place
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
          <Settings className="h-4 w-4 mr-2" />
          Configure APIs
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <MessageList />
        </div>
      </div>
    </div>
  )
}

export default Messages