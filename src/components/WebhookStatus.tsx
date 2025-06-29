import React, { useState, useEffect } from 'react'
import { Globe, Copy, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const WebhookStatus: React.FC = () => {
  const [webhookUrl] = useState('https://torquegpt.onrender.com/api/webhooks/openphone')
  const [isServerRunning, setIsServerRunning] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if webhook server is running
    checkServerStatus()
  }, [])

  const checkServerStatus = async () => {
    setIsChecking(true)
    try {
      const healthUrl = 'https://torquegpt.onrender.com/health'
      const response = await fetch(healthUrl)
      setIsServerRunning(response.ok)
    } catch {
      setIsServerRunning(false)
    } finally {
      setIsChecking(false)
    }
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Webhook URL copied to clipboard')
  }

  const openOpenPhoneSettings = () => {
    window.open('https://app.openphone.com/settings/webhooks', '_blank')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">OpenPhone Webhook</h3>
        </div>
        <button
          onClick={checkServerStatus}
          disabled={isChecking}
          className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          {isChecking ? 'Checking...' : 'Refresh Status'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          {isChecking ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
          ) : isServerRunning ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className={`text-sm font-medium ${
            isChecking ? 'text-gray-500' : isServerRunning ? 'text-green-700' : 'text-red-700'
          }`}>
            Webhook Server: {isChecking ? 'Checking...' : isServerRunning ? 'Running' : 'Offline'}
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
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
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Copy the webhook URL above</li>
                <li>Click "Open OpenPhone Settings" below</li>
                <li>Navigate to Settings → Webhooks</li>
                <li>Add a new webhook with the URL above</li>
                <li>Select "Message Received" as the trigger event</li>
                <li>Save the webhook configuration</li>
              </ol>
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={openOpenPhoneSettings}
              className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open OpenPhone Settings
            </button>
          </div>
        </div>

        {!isServerRunning && !isChecking && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The webhook server appears to be offline. 
              The production server at https://torquegpt.onrender.com may be starting up or experiencing issues.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WebhookStatus