import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Plus, Clock, User, Phone, Car, CheckCircle, X, Eye, ExternalLink } from 'lucide-react'
import { useGoogleCalendar, type GoogleCalendarEvent } from '../hooks/useGoogleCalendar'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import toast from 'react-hot-toast'

/**
 * Calendar Component with Google Calendar Integration
 * 
 * A comprehensive appointment management system featuring:
 * - Google Calendar integration for real appointment booking
 * - Automatic appointment creation from SMS conversations
 * - Conflict detection and prevention
 * - Professional calendar management
 * - Customer email invitations
 * - Mobile calendar sync
 */
const Calendar: React.FC = () => {
  const {
    isInitialized,
    isLoading,
    createCalendarEvent,
    getEvents,
    checkForConflicts,
    getTodaysAppointments,
    getUpcomingAppointments
  } = useGoogleCalendar()

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<GoogleCalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'list'>('week')
  const [todaysEvents, setTodaysEvents] = useState<GoogleCalendarEvent[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<GoogleCalendarEvent[]>([])

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    vehicle_info: '',
    service_type: '',
    date: selectedDate,
    time: '',
    duration: 1,
    notes: ''
  })

  useEffect(() => {
    loadCalendarData()
  }, [isInitialized])

  const loadCalendarData = async () => {
    if (!isInitialized) return

    try {
      const today = await getTodaysAppointments()
      const upcoming = await getUpcomingAppointments()
      setTodaysEvents(today)
      setUpcomingEvents(upcoming)
    } catch (error) {
      console.error('Error loading calendar data:', error)
    }
  }

  const handleBookAppointment = async () => {
    if (!formData.customer_name || !formData.customer_phone || !formData.time) {
      toast.error('Please fill in required fields')
      return
    }

    // Check for conflicts
    const hasConflict = await checkForConflicts(formData.date, formData.time, formData.duration)
    if (hasConflict) {
      toast.error('This time slot conflicts with an existing appointment')
      return
    }

    const result = await createCalendarEvent({
      customerName: formData.customer_name,
      customerPhone: formData.customer_phone,
      customerEmail: formData.customer_email,
      vehicleInfo: formData.vehicle_info,
      serviceType: formData.service_type,
      date: formData.date,
      time: formData.time,
      duration: formData.duration
    })

    if (result) {
      setShowBookingForm(false)
      setFormData({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'tentative': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  // Generate available time slots
  const getAvailableSlots = async (date: string) => {
    const slots = []
    for (let hour = 8; hour < 17; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`
      const hasConflict = await checkForConflicts(date, timeString, 1)
      
      slots.push({
        time: timeString,
        available: !hasConflict
      })
    }
    return slots
  }

  // Generate week view dates
  const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Google Calendar Integration</h3>
          <p className="mt-1 text-sm text-gray-500">
            Setting up calendar integration for appointment management...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage appointments with Google Calendar integration
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

      {/* Google Calendar Integration Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <CalendarIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Google Calendar Integration Active
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Appointments are synced with Google Calendar for reliable scheduling and mobile access.
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
                    <span>{format(new Date(event.start.dateTime), 'h:mm a')}</span>
                    <span>-</span>
                    <span>{event.summary}</span>
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
              Upcoming Appointments ({upcomingEvents.length})
            </h3>
            
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming appointments</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Book your first appointment to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">{event.summary}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                            Scheduled
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {format(new Date(event.start.dateTime), 'MMM d, yyyy')} at {format(new Date(event.start.dateTime), 'h:mm a')}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / (1000 * 60 * 60))} hour{Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / (1000 * 60 * 60)) !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-700 mt-2">{event.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedAppointment(event)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <a
                          href={`https://calendar.google.com/calendar/event?eid=${event.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Google
                        </a>
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
                  <label className="block text-sm font-medium text-gray-700">Email (optional)</label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="For calendar invitations"
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
                  <input
                    type="text"
                    placeholder="Oil change, brake inspection, etc."
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
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
                      {Array.from({ length: 9 }, (_, i) => {
                        const hour = i + 8
                        const timeString = `${hour.toString().padStart(2, '0')}:00`
                        return (
                          <option key={timeString} value={timeString}>
                            {timeString}
                          </option>
                        )
                      })}
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
                  disabled={!formData.customer_name || !formData.customer_phone || !formData.time || isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isLoading ? 'Booking...' : 'Book Appointment'}
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
                  <label className="block text-sm font-medium text-gray-700">Event</label>
                  <p className="text-sm text-gray-900">{selectedAppointment.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <p className="text-sm text-gray-900">{format(new Date(selectedAppointment.start.dateTime), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <p className="text-sm text-gray-900">
                      {format(new Date(selectedAppointment.start.dateTime), 'h:mm a')} - {format(new Date(selectedAppointment.end.dateTime), 'h:mm a')}
                    </p>
                  </div>
                </div>
                {selectedAppointment.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Details</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedAppointment.description}</p>
                  </div>
                )}
                {selectedAppointment.attendees && selectedAppointment.attendees.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Attendees</label>
                    <div className="text-sm text-gray-900">
                      {selectedAppointment.attendees.map((attendee, index) => (
                        <div key={index}>
                          {attendee.displayName} ({attendee.email})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-6">
                <a
                  href={`https://calendar.google.com/calendar/event?eid=${selectedAppointment.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in Google Calendar
                </a>
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