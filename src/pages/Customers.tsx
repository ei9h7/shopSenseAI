import React, { useState, useEffect } from 'react'
import { Users, Phone, Car, MapPin, Calendar, Eye, Plus, Search, Filter } from 'lucide-react'

interface Vehicle {
  year?: string
  make?: string
  model?: string
  details: string
  added_at: string
}

interface ServiceHistory {
  date: string
  inquiry: string
  type: string
}

interface Customer {
  id: string
  phone_number: string
  first_name?: string
  last_name?: string
  full_name?: string
  address?: string
  is_repeat_customer?: boolean
  vehicles: Vehicle[]
  service_history: ServiceHistory[]
  notes: string[]
  created_at: string
  updated_at: string
}

/**
 * Customers Component
 * 
 * A comprehensive customer database management interface featuring:
 * - Customer contact information and history
 * - Vehicle tracking for each customer
 * - Service history and inquiry tracking
 * - Repeat vs new customer identification
 * - Search and filtering capabilities
 * - Integration with messaging system
 * - Customer profile management
 */
const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'new' | 'repeat'>('all')

  useEffect(() => {
    loadCustomers()
    // Refresh every 30 seconds to get latest data
    const interval = setInterval(loadCustomers, 30000)
    return () => clearInterval(interval)
  }, [])

  /**
   * Loads customers from the production API
   */
  const loadCustomers = async () => {
    try {
      const response = await fetch('https://torquegpt.onrender.com/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      } else {
        console.error('Failed to load customers from server')
        setCustomers([])
      }
    } catch (error) {
      console.error('Error loading customers:', error)
      setCustomers([])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Filters customers based on search term and filter type
   */
  const filteredCustomers = customers.filter(customer => {
    // Search filter
    const matchesSearch = !searchTerm || 
      customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone_number.includes(searchTerm) ||
      customer.vehicles.some(v => v.details.toLowerCase().includes(searchTerm.toLowerCase()))

    // Type filter
    const matchesType = filterType === 'all' ||
      (filterType === 'new' && customer.is_repeat_customer === false) ||
      (filterType === 'repeat' && customer.is_repeat_customer === true)

    return matchesSearch && matchesType
  })

  const getCustomerTypeColor = (isRepeat?: boolean) => {
    if (isRepeat === true) return 'bg-green-100 text-green-800'
    if (isRepeat === false) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getCustomerTypeText = (isRepeat?: boolean) => {
    if (isRepeat === true) return 'Repeat Customer'
    if (isRepeat === false) return 'New Customer'
    return 'Unknown'
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
          <h1 className="text-2xl font-bold text-gray-900">Customer Database</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage customer information, vehicles, and service history
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={loadCustomers}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by name, phone, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'new' | 'repeat')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Customers</option>
              <option value="new">New Customers</option>
              <option value="repeat">Repeat Customers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="text-lg font-medium text-gray-900">{customers.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Plus className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">New Customers</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {customers.filter(c => c.is_repeat_customer === false).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Car className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Vehicles</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {customers.reduce((sum, c) => sum + c.vehicles.length, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {customers.length === 0 ? 'No customers yet' : 'No customers match your search'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {customers.length === 0 
                  ? 'Customer information will be collected automatically through SMS conversations.'
                  : 'Try adjusting your search terms or filters.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {customer.full_name || 'Name Pending'}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCustomerTypeColor(customer.is_repeat_customer)}`}>
                          {getCustomerTypeText(customer.is_repeat_customer)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          {customer.phone_number}
                        </div>
                        {customer.address && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {customer.address}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Car className="h-4 w-4 mr-2" />
                          {customer.vehicles.length} vehicle{customer.vehicles.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {customer.service_history.length} service inquir{customer.service_history.length !== 1 ? 'ies' : 'y'}
                        </div>
                      </div>

                      {customer.vehicles.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700">
                            <strong>Vehicles:</strong> {customer.vehicles.map(v => v.details).join(', ')}
                          </p>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-500">
                        Last updated: {new Date(customer.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-gray-900">
                  {selectedCustomer.full_name || 'Customer Profile'}
                </h3>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Contact Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {selectedCustomer.full_name || 'Not provided'}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {selectedCustomer.phone_number}
                      </div>
                      {selectedCustomer.address && (
                        <div>
                          <span className="font-medium">Address:</span> {selectedCustomer.address}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Customer Type:</span>{' '}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCustomerTypeColor(selectedCustomer.is_repeat_customer)}`}>
                          {getCustomerTypeText(selectedCustomer.is_repeat_customer)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Vehicles ({selectedCustomer.vehicles.length})</h4>
                    {selectedCustomer.vehicles.length > 0 ? (
                      <div className="space-y-2">
                        {selectedCustomer.vehicles.map((vehicle, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-md">
                            <div className="font-medium text-sm">{vehicle.details}</div>
                            <div className="text-xs text-gray-500">
                              Added: {new Date(vehicle.added_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No vehicles on file</p>
                    )}
                  </div>
                </div>
                
                {/* Right Column - Service History */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Service History ({selectedCustomer.service_history.length})
                    </h4>
                    {selectedCustomer.service_history.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedCustomer.service_history
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((service, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-md">
                            <div className="text-sm">{service.inquiry}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(service.date).toLocaleDateString()} - {service.type}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No service history</p>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between items-center mb-1">
                        <span>Customer since:</span>
                        <span className="font-medium">{new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Last contact:</span>
                        <span className="font-medium">{new Date(selectedCustomer.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedCustomer(null)}
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

export default Customers