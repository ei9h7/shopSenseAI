import React, { useState } from 'react'
import { FileText, Plus, Eye, Send, Check, X } from 'lucide-react'
import { useQuotes, type Quote } from '../hooks/useQuotes'
import { useBusinessSettings } from '../hooks/useBusinessSettings'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const Quotes: React.FC = () => {
  const { quotes, isLoading, createQuote, updateQuoteStatus } = useQuotes()
  const { settings } = useBusinessSettings()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    vehicle_info: '',
    description: '',
    labor_hours: 1,
    parts_cost: 0
  })

  const handleCreateQuote = () => {
    const laborRate = settings?.labor_rate || 80
    const laborCost = formData.labor_hours * laborRate
    const totalCost = laborCost + formData.parts_cost

    const newQuote = createQuote({
      ...formData,
      labor_rate: laborRate,
      total_cost: totalCost,
      status: 'draft'
    })

    setShowCreateForm(false)
    setFormData({
      customer_name: '',
      customer_phone: '',
      vehicle_info: '',
      description: '',
      labor_hours: 1,
      parts_cost: 0
    })

    toast.success('Quote created successfully')
  }

  const handleStatusUpdate = (quoteId: string, status: Quote['status']) => {
    updateQuoteStatus(quoteId, status)
    toast.success(`Quote ${status}`)
  }

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'declined': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage service quotes for your customers
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </button>
      </div>

      {/* Create Quote Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Quote</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle Info</label>
                  <input
                    type="text"
                    placeholder="2020 Honda Civic"
                    value={formData.vehicle_info}
                    onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Labor Hours</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={formData.labor_hours}
                      onChange={(e) => setFormData({ ...formData, labor_hours: parseFloat(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Parts Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.parts_cost}
                      onChange={(e) => setFormData({ ...formData, parts_cost: parseFloat(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-600">
                    <p>Labor: {formData.labor_hours} hrs × ${settings?.labor_rate || 80}/hr = ${(formData.labor_hours * (settings?.labor_rate || 80)).toFixed(2)}</p>
                    <p>Parts: ${formData.parts_cost.toFixed(2)}</p>
                    <p className="font-medium">Total: ${(formData.labor_hours * (settings?.labor_rate || 80) + formData.parts_cost).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQuote}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                >
                  Create Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quotes List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {quotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No quotes yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start creating quotes for your customers to grow your business.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div key={quote.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{quote.customer_name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                          {quote.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{quote.vehicle_info}</p>
                      <p className="text-sm text-gray-600 mb-2">{quote.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Total: ${quote.total_cost.toFixed(2)}</span>
                        <span>Created: {format(new Date(quote.created_at), 'MMM d, yyyy')}</span>
                        <span>Expires: {format(new Date(quote.expires_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedQuote(quote)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      {quote.status === 'draft' && (
                        <button
                          onClick={() => handleStatusUpdate(quote.id, 'sent')}
                          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </button>
                      )}
                      {quote.status === 'sent' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(quote.id, 'accepted')}
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(quote.id, 'declined')}
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quote Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-sm text-gray-900">{selectedQuote.customer_name}</p>
                  <p className="text-sm text-gray-500">{selectedQuote.customer_phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                  <p className="text-sm text-gray-900">{selectedQuote.vehicle_info}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900">{selectedQuote.description}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span>Labor ({selectedQuote.labor_hours} hrs × ${selectedQuote.labor_rate}/hr):</span>
                      <span>${(selectedQuote.labor_hours * selectedQuote.labor_rate).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Parts:</span>
                      <span>${selectedQuote.parts_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2 mt-2">
                      <span>Total:</span>
                      <span>${selectedQuote.total_cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Quotes