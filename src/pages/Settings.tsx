import React from 'react'
import { Settings as SettingsIcon, Save } from 'lucide-react'

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your shop details and app preferences
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form className="space-y-6">
            {/* Business Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="business-name" className="block text-sm font-medium text-gray-700">
                    Business Name
                  </label>
                  <input
                    type="text"
                    id="business-name"
                    defaultValue="Pink Chicken Speed Shop"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="labor-rate" className="block text-sm font-medium text-gray-700">
                    Labor Rate ($/hour)
                  </label>
                  <input
                    type="number"
                    id="labor-rate"
                    defaultValue="80"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="business-number" className="block text-sm font-medium text-gray-700">
                    Business Number
                  </label>
                  <input
                    type="text"
                    id="business-number"
                    placeholder="123456789RT0001"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    placeholder="(555) 123-4567"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* GST Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">GST Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-base font-medium text-gray-900">Apply GST to:</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center">
                      <input
                        id="gst-parts"
                        name="gst-apply"
                        type="radio"
                        defaultChecked
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                      />
                      <label htmlFor="gst-parts" className="ml-3 block text-sm font-medium text-gray-700">
                        Parts only
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="gst-labor"
                        name="gst-apply"
                        type="radio"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                      />
                      <label htmlFor="gst-labor" className="ml-3 block text-sm font-medium text-gray-700">
                        Labor only
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="gst-both"
                        name="gst-apply"
                        type="radio"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                      />
                      <label htmlFor="gst-both" className="ml-3 block text-sm font-medium text-gray-700">
                        Both parts and labor
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="gst-none"
                        name="gst-apply"
                        type="radio"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                      />
                      <label htmlFor="gst-none" className="ml-3 block text-sm font-medium text-gray-700">
                        None
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Connections */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">API Connections</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">OpenPhone</h4>
                    <p className="text-sm text-gray-500">Connect your phone system</p>
                  </div>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    Connect
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Google Calendar</h4>
                    <p className="text-sm text-gray-500">Sync your appointments</p>
                  </div>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    Connect
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">OpenAI</h4>
                    <p className="text-sm text-gray-500">Enable AI assistant features</p>
                  </div>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    Connect
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Settings