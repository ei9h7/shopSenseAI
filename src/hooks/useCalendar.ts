import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export interface Appointment {
  id: string
  customer_name: string
  customer_phone: string
  vehicle_info: string
  service_type: string
  date: string
  time: string
  duration: number // in hours
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  quote_id?: string
}

export interface TimeSlot {
  time: string
  available: boolean
}

/**
 * useCalendar Hook
 * 
 * Manages appointment scheduling with the following features:
 * - Available time slot management
 * - Appointment booking and status tracking
 * - Integration with quotes system
 * - Automatic scheduling from accepted quotes
 * - Business hours configuration
 * - Conflict detection and prevention
 */
export const useCalendar = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Business hours configuration
  const businessHours = {
    start: '08:00',
    end: '17:00',
    slotDuration: 1, // hours
    daysOpen: [1, 2, 3, 4, 5] // Monday to Friday
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  /**
   * Loads appointments from localStorage
   */
  const loadAppointments = () => {
    try {
      const saved = localStorage.getItem('appointments')
      if (saved) {
        const parsedAppointments = JSON.parse(saved)
        setAppointments(parsedAppointments)
        console.log(`📅 Loaded ${parsedAppointments.length} appointments from storage`)
      } else {
        // Create some sample appointments for demo
        const sampleAppointments = createSampleAppointments()
        setAppointments(sampleAppointments)
        localStorage.setItem('appointments', JSON.stringify(sampleAppointments))
        console.log('📅 Created sample appointments for demo')
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
      setAppointments([])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Creates sample appointments for demo purposes
   */
  const createSampleAppointments = (): Appointment[] => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    return [
      {
        id: 'demo_1',
        customer_name: 'John Smith',
        customer_phone: '+1234567890',
        vehicle_info: '2020 Honda Civic',
        service_type: 'Oil Change',
        date: today.toISOString().split('T')[0],
        time: '10:00',
        duration: 1,
        status: 'scheduled',
        notes: 'Regular maintenance',
        created_at: new Date().toISOString()
      },
      {
        id: 'demo_2',
        customer_name: 'Sarah Johnson',
        customer_phone: '+1987654321',
        vehicle_info: '2018 Toyota Camry',
        service_type: 'Brake Inspection',
        date: tomorrow.toISOString().split('T')[0],
        time: '14:00',
        duration: 2,
        status: 'confirmed',
        notes: 'Customer reported squeaking noise',
        created_at: new Date().toISOString()
      },
      {
        id: 'demo_3',
        customer_name: 'Mike Wilson',
        customer_phone: '+1555123456',
        vehicle_info: '2019 Ford F-150',
        service_type: 'Transmission Service',
        date: nextWeek.toISOString().split('T')[0],
        time: '09:00',
        duration: 4,
        status: 'scheduled',
        notes: 'Scheduled maintenance',
        created_at: new Date().toISOString()
      }
    ]
  }

  /**
   * Saves appointments to localStorage
   */
  const saveAppointments = (newAppointments: Appointment[]) => {
    try {
      localStorage.setItem('appointments', JSON.stringify(newAppointments))
      setAppointments(newAppointments)
      console.log(`📅 Saved ${newAppointments.length} appointments`)
    } catch (error) {
      console.error('Error saving appointments:', error)
      toast.error('Failed to save appointment')
    }
  }

  /**
   * Generates available time slots for a given date
   */
  const getAvailableSlots = (date: string): TimeSlot[] => {
    const selectedDate = new Date(date)
    const dayOfWeek = selectedDate.getDay()
    
    // Check if day is open
    if (!businessHours.daysOpen.includes(dayOfWeek)) {
      return []
    }

    const slots: TimeSlot[] = []
    const startHour = parseInt(businessHours.start.split(':')[0])
    const endHour = parseInt(businessHours.end.split(':')[0])

    // Generate time slots
    for (let hour = startHour; hour < endHour; hour += businessHours.slotDuration) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`
      
      // Check if slot is already booked
      const isBooked = appointments.some(apt => 
        apt.date === date && 
        apt.time === timeString && 
        apt.status !== 'cancelled'
      )

      slots.push({
        time: timeString,
        available: !isBooked
      })
    }

    return slots
  }

  /**
   * Books a new appointment
   */
  const bookAppointment = (appointmentData: Omit<Appointment, 'id' | 'created_at' | 'status'>) => {
    // Check if slot is still available
    const availableSlots = getAvailableSlots(appointmentData.date)
    const requestedSlot = availableSlots.find(slot => slot.time === appointmentData.time)
    
    if (!requestedSlot || !requestedSlot.available) {
      toast.error('This time slot is no longer available')
      return null
    }

    const newAppointment: Appointment = {
      ...appointmentData,
      id: Date.now().toString(),
      status: 'scheduled',
      created_at: new Date().toISOString()
    }

    const updatedAppointments = [newAppointment, ...appointments]
    saveAppointments(updatedAppointments)
    toast.success('Appointment booked successfully!')
    return newAppointment
  }

  /**
   * Updates appointment status
   */
  const updateAppointmentStatus = (appointmentId: string, status: Appointment['status']) => {
    const updatedAppointments = appointments.map(apt =>
      apt.id === appointmentId ? { ...apt, status } : apt
    )
    saveAppointments(updatedAppointments)
    toast.success(`Appointment ${status}`)
  }

  /**
   * Cancels an appointment
   */
  const cancelAppointment = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, 'cancelled')
  }

  /**
   * Gets appointments for a specific date
   */
  const getAppointmentsForDate = (date: string) => {
    return appointments.filter(apt => 
      apt.date === date && apt.status !== 'cancelled'
    ).sort((a, b) => a.time.localeCompare(b.time))
  }

  /**
   * Gets today's appointments
   */
  const getTodaysAppointments = () => {
    const today = new Date().toISOString().split('T')[0]
    return getAppointmentsForDate(today)
  }

  /**
   * Gets upcoming appointments (next 7 days)
   */
  const getUpcomingAppointments = () => {
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date)
      return aptDate >= today && 
             aptDate <= nextWeek && 
             apt.status !== 'cancelled'
    }).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time)
    })
  }

  /**
   * Gets calendar statistics
   */
  const getCalendarStats = () => {
    const today = new Date().toISOString().split('T')[0]
    const thisWeek = appointments.filter(apt => {
      const aptDate = new Date(apt.date)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      return aptDate >= weekStart && 
             aptDate <= weekEnd && 
             apt.status !== 'cancelled'
    })

    return {
      total: appointments.filter(apt => apt.status !== 'cancelled').length,
      today: appointments.filter(apt => apt.date === today && apt.status !== 'cancelled').length,
      thisWeek: thisWeek.length,
      upcoming: getUpcomingAppointments().length
    }
  }

  /**
   * Generates a booking link for customers
   */
  const generateBookingLink = (customerPhone: string, quoteId?: string) => {
    const baseUrl = window.location.origin
    const params = new URLSearchParams({
      phone: customerPhone,
      ...(quoteId && { quote: quoteId })
    })
    return `${baseUrl}/book?${params.toString()}`
  }

  /**
   * Auto-books appointment from accepted quote
   */
  const bookFromQuote = (quote: any, preferredDate?: string, preferredTime?: string) => {
    const appointmentData = {
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      vehicle_info: quote.vehicle_info,
      service_type: quote.description,
      date: preferredDate || '', // Will need to be filled by customer
      time: preferredTime || '',
      duration: Math.ceil(quote.labor_hours),
      notes: `Auto-booked from quote #${quote.id}`,
      quote_id: quote.id
    }

    if (preferredDate && preferredTime) {
      return bookAppointment(appointmentData)
    }

    // Return partial data for customer to complete booking
    return appointmentData
  }

  /**
   * Checks for scheduling conflicts
   */
  const checkForConflicts = (date: string, time: string, duration: number = 1): boolean => {
    const proposedStart = new Date(`${date}T${time}:00`)
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60 * 60 * 1000)

    return appointments.some(apt => {
      if (apt.status === 'cancelled' || apt.date !== date) return false
      
      const aptStart = new Date(`${apt.date}T${apt.time}:00`)
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60 * 60 * 1000)
      
      return (proposedStart < aptEnd && proposedEnd > aptStart)
    })
  }

  return {
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
    getCalendarStats,
    generateBookingLink,
    bookFromQuote,
    checkForConflicts,
    refreshAppointments: loadAppointments
  }
}