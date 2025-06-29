import { useState, useEffect } from 'react'

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
}

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const createQuote = (quoteData: Omit<Quote, 'id' | 'created_at' | 'expires_at'>) => {
    const newQuote: Quote = {
      ...quoteData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    }

    const updatedQuotes = [newQuote, ...quotes]
    setQuotes(updatedQuotes)
    localStorage.setItem('quotes', JSON.stringify(updatedQuotes))
    return newQuote
  }

  const updateQuoteStatus = (quoteId: string, status: Quote['status']) => {
    const updatedQuotes = quotes.map(quote =>
      quote.id === quoteId ? { ...quote, status } : quote
    )
    setQuotes(updatedQuotes)
    localStorage.setItem('quotes', JSON.stringify(updatedQuotes))
  }

  const getActiveQuotes = () => {
    return quotes.filter(quote => quote.status === 'sent')
  }

  const getQuoteStats = () => {
    return {
      total: quotes.length,
      active: quotes.filter(q => q.status === 'sent').length,
      accepted: quotes.filter(q => q.status === 'accepted').length,
      totalValue: quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + q.total_cost, 0)
    }
  }

  return {
    quotes,
    isLoading,
    createQuote,
    updateQuoteStatus,
    getActiveQuotes,
    getQuoteStats,
    refreshQuotes: loadQuotes
  }
}