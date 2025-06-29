import React from 'react'
import { Settings as SettingsIcon, Save, Key, Phone, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useBusinessSettings } from '../hooks/useBusinessSettings'
import WebhookStatus from '../components/WebhookStatus'
import type { BusinessSettings } from '../types'

const settingsSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  labor_rate: z.number().min(1, 'Labor rate must be greater than 0'),
  phone_number: z.string().optional(),
  business_number: z.string().optional(),
  gst_setting: z.enum(['parts', 'labor', 'both', 'none']),
  openai_api_key: z.string().optional(),
  openphone_api_key: z.string().optional()
})

type SettingsFormData = z.infer<typeof settingsSchema>

const Settings: React.FC = () => {
  const { settings, serverSettings, updateSettings, isUpdating, refreshSettings } = useBusinessSettings()

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name: settings?.business_name || 'Pink Chicken Speed Shop',
      labor_rate: settings?.labor_rate || 80,
      phone_number: settings?.phone_number || '',
      business_number: settings?.business_number || '',
      gst_setting: settings?.gst_setting || 'parts',
      openai_api_key: settings?.openai_api_key || '',
      openphone_api_key: settings?.openphone_api_key || ''
    }
  })

  const watchedValues = watch()

  const onSubmit = (data: SettingsFormData) => {
    updateSettings(data)
  }

  const getApiKeyStatus = (apiKey?: string, serverConfigured?: boolean) => {
    if (serverConfigured) {
      return { status: 'server', color: 'text-green-600', icon: CheckCircle, text: 'Configured on server' }
    }
    if (!apiKey || apiKey.length < 10) {
      return { status: 'missing', color: 'text-red-600', icon: AlertCircle, text: 'Not configured' }
    }
    return { status: 'local', color: 'text-blue-600', icon: CheckCircle, text: 'Configured locally' }
  }

  const openaiStatus = getApiKeyStatus(watchedValues.openai_api_key, serverSettings?.openai_configured)
  const openphoneStatus = getApiKeyStatus(watchedValues.openphone_api_key, serverSettings?.openphone_configured)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your shop details and app preferences
        </p>
      </div>

      {/* API Status Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">API Configuration Status</h3>
          <button
            onClick={refreshSettings}
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <openaiStatus.icon className={`h-5 w-5 ${openaiStatus.color}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">OpenAI API</p>
              <p className={`text-xs ${openaiStatus.color}`}>
                {openaiStatus.text}
                {serverSettings?.openai_key_preview && (
                  <span className="ml-1 font-mono">({serverSettings.openai_key_preview})</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <openphoneStatus.icon className={`h-5 w-5 ${openphoneStatus.color}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">OpenPhone API</p>
              <p className={`text-xs ${openphoneStatus.color}`}>
                {openphoneStatus.text}
                {serverSettings?.openphone_key_preview && (
                  <span className="ml-1 font-mono">({serverSettings.openphone_key_preview})</span>
                )}
              </p>
            </div>
          </div>
        </div>
        {(openaiStatus.status === 'missing' || openphoneStatus.status === 'missing') && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Some API keys are missing. The app will have limited functionality until all keys are configured.
              {serverSettings && (
                <span> API keys configured on the server will persist across deployments.</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Webhook Status */}
      <WebhookStatus />

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
                    Business Name
                  </label>
                  <input
                    {...register('business_name')}
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  {errors.business_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.business_name.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="labor_rate" className="block text-sm font-medium text-gray-700">
                    Labor Rate ($/hour)
                  </label>
                  <input
                    {...register('labor_rate', { valueAsNumber: true })}
                    type="number"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  {errors.labor_rate && (
                    <p className="mt-1 text-sm text-red-600">{errors.labor_rate.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="business_number" className="block text-sm font-medium text-gray-700">
                    Business Number
                  </label>
                  <input
                    {...register('business_number')}
                    type="text"
                    placeholder="123456789RT0001"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    {...register('phone_number')}
                    type="tel"
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
                        {...register('gst_setting')}
                        id="gst-parts"
                        value="parts"
                        type="radio"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                      />
                      <label htmlFor="gst-parts" className="ml-3 block text-sm font-medium text-gray-700">
                        Parts only
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        {...register('gst_setting')}
                        id="gst-labor"
                        value="labor"
                        type="radio"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                      />
                      <label htmlFor="gst-labor" className="ml-3 block text-sm font-medium text-gray-700">
                        Labor only
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        {...register('gst_setting')}
                        id="gst-both"
                        value="both"
                        type="radio"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                      />
                      <label htmlFor="gst-both" className="ml-3 block text-sm font-medium text-gray-700">
                        Both parts and labor
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        {...register('gst_setting')}
                        id="gst-none"
                        value="none"
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

            {/* API Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    <label htmlFor="openai_api_key" className="block text-sm font-medium text-gray-700">
                      OpenAI API Key
                    </label>
                    <openaiStatus.icon className={`h-4 w-4 ${openaiStatus.color}`} />
                  </div>
                  <input
                    {...register('openai_api_key')}
                    type="password"
                    placeholder={serverSettings?.openai_configured ? 'Configured on server' : 'sk-...'}
                    disabled={serverSettings?.openai_configured}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Required for AI message processing and quote generation
                    {serverSettings?.openai_configured && (
                      <span className="text-green-600 font-medium"> (Configured on server)</span>
                    )}
                  </p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <label htmlFor="openphone_api_key" className="block text-sm font-medium text-gray-700">
                      OpenPhone API Key
                    </label>
                    <openphoneStatus.icon className={`h-4 w-4 ${openphoneStatus.color}`} />
                  </div>
                  <input
                    {...register('openphone_api_key')}
                    type="password"
                    placeholder={serverSettings?.openphone_configured ? 'Configured on server' : 'op_...'}
                    disabled={serverSettings?.openphone_configured}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Required for SMS communication with customers
                    {serverSettings?.openphone_configured && (
                      <span className="text-green-600 font-medium"> (Configured on server)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Settings