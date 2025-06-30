import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Plus, Clock, User, Phone, Car, CheckCircle, X, Eye, Edit, Trash2 } from 'lucide-react'
import { useCalendar, type Appointment } from '../hooks/useCalendar'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

/**
 * Calendar Component with Full Appointment Management
 * 
 * A comprehensive appointment management system featuring:
 * - Real appointment booking and management
 * - Automatic appointment creation from SMS conversations
 * - Conflict detection and prevention
 * - Professional calendar management
 * - Customer information tracking
 * - Multiple view modes (week, day, list)
 * - Status management and updates
 */
const Calendar: React.FC = () => {
  const {
    appointments,
    isLoading,
    businessHours,
    getAvailableSlots,
    bookAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    getAppointmentsForDate,
    getTodaysAppointments,
    getUpcomingAppointments,
    checkForConflicts
  } = useCalendar()

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'list'>('list')
  const [todaysEvents, setTodaysEvents] = useState<Appointment[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Appointment[]>([])
  const [availableSlots, setAvailableSlots] = useState<any[]>([])

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    vehicle_info: '',
    service_type: '',
    date: selectedDate,
    time: '',
    duration: 1,
    notes: ''
  })

  useEffect(() => {
    loadCalendarData()
  }, [appointments])

  useEffect(() => {
    if (selectedDate) {
      const slots = getAvailableSlots(selectedDate)
      setAvailableSlots(slots)
    }
  }, [selectedDate, appointments])

  const loadCalendarData = () => {
    const today = getTodaysAppointments()
    const upcoming = getUpcomingAppointments()
    setTodaysEvents(today)
    setUpcomingEvents(upcoming)
  }

  const handleBookAppointment = async () => {
    if (!formData.customer_name || !formData.customer_phone || !formData.time) {
      toast.error('Please fill in required fields')
      return
    }

    // Check for conflicts
    const hasConflict = checkForConflicts(formData.date, formData.time, formData.duration)
    if (hasConflict) {
      toast.error('This time slot conflicts with an existing appointment')
      return
    }

    const result = bookAppointment({
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      vehicle_info: formData.vehicle_info,
      service_type: formData.service_type,
      date: formData.date,
      time: formData.time,
      duration: formData.duration,
      notes: formData.notes
    })

    if (result) {
      setShowBookingForm(false)
      setFormData({
        customer_name: '',
        customer_phone: '',
        vehicle_info: '',
        service_type: '',
        date: selectedDate,
        time: '',
        duration: 1,
        notes: ''
      })
      loadCalendarData()
    }
  }

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusUpdate = (appointmentId: string, status: Appointment['status']) => {
    updateAppointmentStatus(appointmentId, status)
    loadCalendarData()
  }

  const handleCancelAppointment = (appointmentId: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      cancelAppointment(appointmentId)
      loadCalendarData()
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
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage appointments and scheduling
          </p>
        </div>
        <div className="flex space-x-2">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'week' 
                  ? 'bg-primary-600 text-white border-primary-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-2 text-sm font-medium border-t border-b ${
                viewMode === 'day' 
                  ? 'bg-primary-600 text-white border-primary-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border ${
                viewMode === 'list' 
                  ? 'bg-primary-600 text-white border-primary-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setShowBookingForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Calendar Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <CalendarIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Calendar System Active
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Appointments are managed locally with conflict detection and status tracking.
                {todaysEvents.length > 0 && (
                  <span className="font-medium"> {todaysEvents.length} appointment{todaysEvents.length !== 1 ? 's' : ''} today.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      {todaysEvents.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Today's Schedule ({todaysEvents.length} appointment{todaysEvents.length !== 1 ? 's' : ''})
              </h3>
              <div className="mt-2 text-sm text-green-700">
                {todaysEvents.map(event => (
                  <div key={event.id} className="flex items-center space-x-2">
                    <span>{event.time}</span>
                    <span>-</span>
                    <span>{event.customer_name} ({event.service_type})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Views */}
      {viewMode === 'list' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              All Appointments ({appointments.filter(apt => apt.status !== 'cancelled').length})
            </h3>
            
            {appointments.filter(apt => apt.status !== 'cancelled').length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments scheduled</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Book your first appointment to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments
                  .filter(apt => apt.status !== 'cancelled')
                  .sort((a, b) => {
                    const dateCompare = a.date.localeCompare(b.date)
                    return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time)
                  })
                  .map((appointment) => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">{appointment.customer_name}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {format(parseISO(appointment.date), 'MMM d, yyyy')} at {appointment.time}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {appointment.duration} hour{appointment.duration !== 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            {appointment.customer_phone}
                          </div>
                          <div className="flex items-center">
                            <Car className="h-4 w-4 mr-2" />
                            {appointment.vehicle_info}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>Service:</strong> {appointment.service_type}
                        </p>
                        {appointment.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Notes:</strong> {appointment.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedAppointment(appointment)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        {appointment.status === 'scheduled' && (
                          <button
                            onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirm
                          </button>
                        )}
                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelAppointment(appointment.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Book New Appointment</h3>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
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
                  <label className="block text-sm font-medium text-gray-700">Service Type</label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Select service</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Brake Service">Brake Service</option>
                    <option value="Tire Service">Tire Service</option>
                    <option value="Battery Replacement">Battery Replacement</option>
                    <option value="Transmission Service">Transmission Service</option>
                    <option value="Engine Repair">Engine Repair</option>
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Tune Up">Tune Up</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time *</label>
                    <select
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Select time</option>
                      {availableSlots.map((slot) => (
                        <option 
                          key={slot.time} 
                          value={slot.time}
                          disabled={!slot.available}
                        >
                          {slot.time} {!slot.available ? '(Booked)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={3}>3 hours</option>
                    <option value={4}>4 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBookAppointment}
                  disabled={!formData.customer_name || !formData.customer_phone || !formData.time}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Appointment Details</h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-sm text-gray-900">{selectedAppointment.customer_name}</p>
                  <p className="text-sm text-gray-500">{selectedAppointment.customer_phone}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <p className="text-sm text-gray-900">{format(parseISO(selectedAppointment.date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <p className="text-sm text-gray-900">{selectedAppointment.time} ({selectedAppointment.duration}h)</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                  <p className="text-sm text-gray-900">{selectedAppointment.vehicle_info}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service</label>
                  <p className="text-sm text-gray-900">{selectedAppointment.service_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </div>
                {selectedAppointment.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-900">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-6">
                <div className="flex space-x-2">
                  {selectedAppointment.status === 'scheduled' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedAppointment.id, 'confirmed')
                        setSelectedAppointment(null)
                      }}
                      className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm
                    </button>
                  )}
                  {selectedAppointment.status === 'confirmed' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedAppointment.id, 'completed')
                        setSelectedAppointment(null)
                      }}
                      className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSelectedAppointment(null)}
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

export default Calendar