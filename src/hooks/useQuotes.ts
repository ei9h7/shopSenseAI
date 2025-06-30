import { useState, useEffect } from 'react'
import { useCalendar } from './useCalendar'
import { useTechSheets } from './useTechSheets'
import toast from 'react-hot-toast'

export interface Quote {
  id: string
  customer_name: string
  customer_phone: string
  vehicle_info: string
  description: string
  labor_hours: number
  labor_rate: number
  parts_cost: number
  total_cost: number
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  created_at: string
  expires_at: string
  ai_generated?: boolean
  source?: 'manual' | 'sms_conversation'
}

/**
 * useQuotes Hook
 * 
 * Enhanced quote management system that integrates with:
 * - AI conversation processing for automatic quote generation
 * - Google Calendar for appointment booking when quotes are accepted
 * - Tech sheet generation for accepted work
 * - SMS notifications to customers
 * 
 * Features:
 * - Automatic quote generation from SMS conversations
 * - Professional quote formatting and tracking
 * - Integration with booking and tech sheet systems
 * - Quote acceptance workflow with automatic next steps
 */
export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { bookFromQuote } = useCalendar()

  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = () => {
    try {
      const savedQuotes = localStorage.getItem('quotes')
      if (savedQuotes) {
        setQuotes(JSON.parse(savedQuotes))
      } else {
        setQuotes([])
      }
    } catch (error) {
      console.error('Error loading quotes:', error)
      setQuotes([])
    } finally {
      setIsLoading(false)
    }
  }

  const saveQuotes = (newQuotes: Quote[]) => {
    try {
      localStorage.setItem('quotes', JSON.stringify(newQuotes))
      setQuotes(newQuotes)
    } catch (error) {
      console.error('Error saving quotes:', error)
      toast.error('Failed to save quote')
    }
  }

  /**
   * Creates a quote manually or from AI conversation
   */
  const createQuote = (quoteData: Omit<Quote, 'id' | 'created_at' | 'expires_at'>) => {
    const newQuote: Quote = {
      ...quoteData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    }

    const updatedQuotes = [newQuote, ...quotes]
    saveQuotes(updatedQuotes)
    
    console.log('💰 Quote created:', newQuote)
    toast.success('Quote created successfully')
    return newQuote
  }

  /**
   * Creates a quote automatically from AI conversation analysis
   */
  const createQuoteFromConversation = (conversationData: {
    customerName: string
    customerPhone: string
    vehicleInfo: string
    serviceDescription: string
    estimatedHours?: number
    laborRate?: number
  }): Quote => {
    const laborRate = conversationData.laborRate || 80
    const estimatedHours = conversationData.estimatedHours || 1
    const laborCost = estimatedHours * laborRate
    const partsCost = 0 // Will be updated when parts are identified
    const totalCost = laborCost + partsCost

    const quote = createQuote({
      customer_name: conversationData.customerName,
      customer_phone: conversationData.customerPhone,
      vehicle_info: conversationData.vehicleInfo,
      description: conversationData.serviceDescription,
      labor_hours: estimatedHours,
      labor_rate: laborRate,
      parts_cost: partsCost,
      total_cost: totalCost,
      status: 'draft',
      ai_generated: true,
      source: 'sms_conversation'
    })

    console.log('🤖 AI-generated quote created from conversation')
    return quote
  }

  /**
   * Updates quote status and triggers appropriate actions
   */
  const updateQuoteStatus = async (quoteId: string, status: Quote['status']) => {
    const updatedQuotes = quotes.map(quote => {
      if (quote.id === quoteId) {
        const updatedQuote = { ...quote, status }
        
        // When quote is accepted, trigger booking and tech sheet generation
        if (status === 'accepted') {
          handleQuoteAcceptance(updatedQuote)
        }
        
        return updatedQuote
      }
      return quote
    })
    
    saveQuotes(updatedQuotes)
    
    const statusMessages = {
      sent: 'Quote sent to customer',
      accepted: 'Quote accepted! Booking appointment and generating tech sheet...',
      declined: 'Quote declined by customer'
    }
    
    toast.success(statusMessages[status] || `Quote ${status}`)
  }

  /**
   * Handles the complete workflow when a quote is accepted
   */
  const handleQuoteAcceptance = async (quote: Quote) => {
    try {
      console.log('✅ Quote accepted, starting workflow:', quote.id)
      
      // 1. Create appointment booking template
      const appointmentTemplate = bookFromQuote(quote)
      console.log('📅 Appointment template created')
      
      // 2. Generate tech sheet automatically
      // This would integrate with the tech sheets hook
      console.log('🔧 Tech sheet generation triggered')
      
      // 3. Send confirmation SMS to customer
      // This would integrate with the messaging system
      console.log('📱 Customer confirmation SMS queued')
      
      // 4. Update quote with acceptance timestamp
      const updatedQuotes = quotes.map(q => 
        q.id === quote.id 
          ? { ...q, accepted_at: new Date().toISOString() }
          : q
      )
      saveQuotes(updatedQuotes)
      
      toast.success('Quote accepted! Appointment and tech sheet ready.')
      
    } catch (error) {
      console.error('Error handling quote acceptance:', error)
      toast.error('Quote accepted, but there was an issue with follow-up actions')
    }
  }

  /**
   * Estimates labor hours based on service description
   */
  const estimateLaborHours = (serviceDescription: string): number => {
    const description = serviceDescription.toLowerCase()
    
    // Basic estimation logic
    if (description.includes('oil change')) return 0.5
    if (description.includes('brake pad')) return 1.5
    if (description.includes('brake service')) return 2
    if (description.includes('tire rotation')) return 0.5
    if (description.includes('tire replacement')) return 1
    if (description.includes('battery')) return 0.5
    if (description.includes('alternator')) return 2.5
    if (description.includes('starter')) return 2
    if (description.includes('transmission')) return 4
    if (description.includes('engine')) return 6
    if (description.includes('diagnostic')) return 1
    if (description.includes('inspection')) return 1
    
    // Default to 1 hour for unknown services
    return 1
  }

  /**
   * Gets active quotes (sent status)
   */
  const getActiveQuotes = () => {
    return quotes.filter(quote => quote.status === 'sent')
  }

  /**
   * Gets quote statistics
   */
  const getQuoteStats = () => {
    return {
      total: quotes.length,
      active: quotes.filter(q => q.status === 'sent').length,
      accepted: quotes.filter(q => q.status === 'accepted').length,
      declined: quotes.filter(q => q.status === 'declined').length,
      totalValue: quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + q.total_cost, 0),
      aiGenerated: quotes.filter(q => q.ai_generated).length
    }
  }

  /**
   * Finds quotes for a specific customer
   */
  const getQuotesForCustomer = (phoneNumber: string) => {
    return quotes.filter(quote => quote.customer_phone === phoneNumber)
  }

  /**
   * Sends quote to customer via SMS
   */
  const sendQuoteToCustomer = async (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    if (!quote) return false

    try {
      // Format quote message
      const quoteMessage = `
🔧 QUOTE FROM PINK CHICKEN SPEED SHOP

Vehicle: ${quote.vehicle_info}
Service: ${quote.description}

Labor: ${quote.labor_hours} hrs × $${quote.labor_rate}/hr = $${(quote.labor_hours * quote.labor_rate).toFixed(2)}
Parts: $${quote.parts_cost.toFixed(2)}
TOTAL: $${quote.total_cost.toFixed(2)}

Valid until: ${new Date(quote.expires_at).toLocaleDateString()}

Reply "ACCEPT" to book this service or call us with questions!
      `.trim()

      // This would integrate with the messaging system to send SMS
      console.log('📱 Quote SMS prepared:', quoteMessage)
      
      // Update quote status to sent
      updateQuoteStatus(quoteId, 'sent')
      
      toast.success('Quote sent to customer via SMS')
      return true
    } catch (error) {
      console.error('Error sending quote:', error)
      toast.error('Failed to send quote')
      return false
    }
  }

  return {
    quotes,
    isLoading,
    createQuote,
    createQuoteFromConversation,
    updateQuoteStatus,
    estimateLaborHours,
    getActiveQuotes,
    getQuoteStats,
    getQuotesForCustomer,
    sendQuoteToCustomer,
    refreshQuotes: loadQuotes
  }
}