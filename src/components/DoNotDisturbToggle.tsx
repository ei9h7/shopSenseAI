import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useBusinessSettings } from '../hooks/useBusinessSettings'

const DoNotDisturbToggle: React.FC = () => {
  const { settings, toggleDnd } = useBusinessSettings()
  const isDndEnabled = settings?.dnd_enabled || false

  const handleToggle = () => {
    toggleDnd(!isDndEnabled)
  }

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm font-medium text-gray-700">
        Do Not Disturb
      </span>
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          isDndEnabled ? 'bg-primary-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isDndEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          <span className="flex items-center justify-center h-full w-full">
            {isDndEnabled ? (
              <Moon className="h-3 w-3 text-primary-600" />
            ) : (
              <Sun className="h-3 w-3 text-gray-400" />
            )}
          </span>
        </span>
      </button>
      <span className={`text-sm ${isDndEnabled ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
        {isDndEnabled ? 'ON' : 'OFF'}
      </span>
      {isDndEnabled && (
        <span className="text-xs text-gray-500 ml-2">
          AI will auto-respond to messages
        </span>
      )}
    </div>
  )
}

export default DoNotDisturbToggle