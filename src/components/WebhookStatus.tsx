import React, { useState, useEffect } from 'react'
import { Globe, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { webhookManager } from '../services/webhookManager'
import toast from 'react-hot-toast'

const WebhookStatus: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isServerRunning, setIsServerRunning] = useState(false)

  useEffect(() => {
    const url = webhookManager.getWebhookUrl()
    setWebhookUrl(url)
    
    // Check if webhook server is running
    checkServerStatus()
  }, [])

  const checkServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/health')
      setIsServerRunning(response.ok)
    } catch {
      setIsServerRunning(false)
    }
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Webhook URL copied to clipboard')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Globe className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900">OpenPhone Webhook</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          {isServerRunning ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className={`text-sm font-medium ${
            isServerRunning ? 'text-green-700' : 'text-red-700'
          }`}>
            Webhook Server: {isServerRunning ? 'Running' : 'Stopped'}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook URL for OpenPhone:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={webhookUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            />
            <button
              onClick={copyWebhookUrl}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Copy the webhook URL above</li>
            <li>Go to your OpenPhone dashboard</li>
            <li>Navigate to Settings → Webhooks</li>
            <li>Add a new webhook with the URL above</li>
            <li>Select "Message Received" as the trigger event</li>
            <li>Save the webhook configuration</li>
          </ol>
        </div>

        {!isServerRunning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The webhook server is not running. 
              Run <code className="bg-yellow-100 px-1 rounded">npm run dev</code> to start both the client and webhook server.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WebhookStatus