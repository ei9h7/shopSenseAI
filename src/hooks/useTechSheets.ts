import { useState, useEffect } from 'react'
import { useBusinessSettings } from './useBusinessSettings'
import type { Quote } from './useQuotes'
import toast from 'react-hot-toast'

export interface TechSheet {
  id: string
  title: string
  description: string
  vehicle_info?: string
  customer_name?: string
  estimated_time: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tools_required: string[]
  parts_needed: string[]
  safety_warnings: string[]
  step_by_step: string[]
  tips: string[]
  created_at: string
  generated_by: 'ai' | 'manual'
  source?: 'booking' | 'manual'
  quote_id?: string
}

/**
 * useTechSheets Hook
 * 
 * A React hook for managing technical repair sheets with AI generation capabilities.
 * This hook provides functionality for:
 * 
 * - Manual tech sheet generation from job descriptions
 * - Auto-generation from accepted quotes/bookings
 * - Local storage persistence
 * - AI-powered content generation via OpenAI
 * - Professional formatting for workshop use
 * 
 * The hook integrates with the business settings to access OpenAI API keys
 * and provides comprehensive error handling for production use.
 */
export const useTechSheets = () => {
  const [techSheets, setTechSheets] = useState<TechSheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const { settings, serverSettings } = useBusinessSettings()

  useEffect(() => {
    loadTechSheets()
  }, [])

  /**
   * Loads tech sheets from localStorage
   */
  const loadTechSheets = () => {
    try {
      const saved = localStorage.getItem('tech-sheets')
      if (saved) {
        setTechSheets(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading tech sheets:', error)
      setTechSheets([])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Saves tech sheets to localStorage
   */
  const saveTechSheets = (sheets: TechSheet[]) => {
    try {
      localStorage.setItem('tech-sheets', JSON.stringify(sheets))
      setTechSheets(sheets)
    } catch (error) {
      console.error('Error saving tech sheets:', error)
      toast.error('Failed to save tech sheet')
    }
  }

  /**
   * Gets the effective OpenAI API key (server takes precedence)
   */
  const getOpenAIKey = () => {
    if (serverSettings?.openai_configured) {
      // Use server-side API for AI processing when key is on server
      return 'server-configured'
    }
    return settings?.openai_api_key
  }

  /**
   * Generates a tech sheet using AI based on job description
   * 
   * @param jobDescription - Description of the repair job
   * @param vehicleInfo - Optional vehicle information
   * @param customerName - Optional customer name for booking-generated sheets
   * @param quoteId - Optional quote ID for linking
   * @returns Promise<TechSheet | null> - The generated tech sheet or null if failed
   */
  const generateTechSheet = async (
    jobDescription: string,
    vehicleInfo?: string,
    customerName?: string,
    quoteId?: string
  ): Promise<TechSheet | null> => {
    const apiKey = getOpenAIKey()
    
    if (!apiKey) {
      toast.error('OpenAI API key not configured')
      return null
    }

    setIsGenerating(true)
    try {
      const prompt = vehicleInfo 
        ? `${jobDescription} for ${vehicleInfo}`
        : jobDescription

      let aiResponse: string

      if (apiKey === 'server-configured') {
        // Use server-side API when key is configured on server
        const response = await fetch('https://torquegpt.onrender.com/api/generate-tech-sheet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobDescription: prompt,
            vehicleInfo,
            customerName
          })
        })

        if (!response.ok) {
          throw new Error(`Server API error: ${response.status}`)
        }

        const data = await response.json()
        aiResponse = data.content
      } else {
        // Use client-side API when key is configured locally
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            temperature: 0.7,
            max_tokens: 1500,
            messages: [
              {
                role: 'system',
                content: `You are an expert automotive technician creating detailed repair guides. Generate a comprehensive tech sheet for the given job description. Format your response as JSON with these exact fields:

{
  "title": "Brief descriptive title",
  "estimated_time": number (hours as decimal),
  "difficulty": "Easy|Medium|Hard",
  "tools_required": ["tool1", "tool2"],
  "parts_needed": ["part1", "part2"],
  "safety_warnings": ["warning1", "warning2"],
  "step_by_step": ["step1", "step2", "step3"],
  "tips": ["tip1", "tip2"]
}

Make the instructions detailed and professional for a working mechanic.`
              },
              {
                role: 'user',
                content: `Generate a detailed tech sheet for this automotive repair job: ${prompt}`
              }
            ]
          })
        })

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        aiResponse = data.choices[0]?.message?.content || ''
      }

      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      // Parse the AI response
      let parsedResponse
      try {
        parsedResponse = JSON.parse(aiResponse)
      } catch {
        // Fallback if AI doesn't return valid JSON
        parsedResponse = {
          title: jobDescription.substring(0, 50) + '...',
          estimated_time: 2,
          difficulty: 'Medium',
          tools_required: ['Basic hand tools', 'Socket set'],
          parts_needed: ['As needed'],
          safety_warnings: ['Wear safety glasses', 'Use proper lifting techniques'],
          step_by_step: ['Assess the issue', 'Gather required tools', 'Perform repair', 'Test functionality'],
          tips: ['Take photos before disassembly', 'Keep parts organized']
        }
      }

      // Create new tech sheet
      const newTechSheet: TechSheet = {
        id: Date.now().toString(),
        title: parsedResponse.title,
        description: jobDescription,
        vehicle_info: vehicleInfo,
        customer_name: customerName,
        estimated_time: parsedResponse.estimated_time || 2,
        difficulty: parsedResponse.difficulty || 'Medium',
        tools_required: parsedResponse.tools_required || [],
        parts_needed: parsedResponse.parts_needed || [],
        safety_warnings: parsedResponse.safety_warnings || [],
        step_by_step: parsedResponse.step_by_step || [],
        tips: parsedResponse.tips || [],
        created_at: new Date().toISOString(),
        generated_by: 'ai',
        source: customerName ? 'booking' : 'manual',
        quote_id: quoteId
      }

      // Save to storage
      const updatedSheets = [newTechSheet, ...techSheets]
      saveTechSheets(updatedSheets)

      console.log('✅ Tech sheet generated:', newTechSheet.title)
      return newTechSheet
    } catch (error) {
      console.error('Error generating tech sheet:', error)
      toast.error('Failed to generate tech sheet. Please try again.')
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Auto-generates a tech sheet from an accepted quote
   * This is called when a quote is accepted and becomes a booking
   */
  const generateFromQuote = async (quote: Quote): Promise<TechSheet | null> => {
    console.log('🔧 Generating tech sheet from quote:', quote.id)
    
    const jobDescription = `${quote.description}`
    const result = await generateTechSheet(
      jobDescription, 
      quote.vehicle_info, 
      quote.customer_name,
      quote.id
    )
    
    if (result) {
      console.log('✅ Tech sheet generated from quote successfully')
    }
    
    return result
  }

  /**
   * Deletes a tech sheet
   */
  const deleteTechSheet = (sheetId: string) => {
    const updatedSheets = techSheets.filter(sheet => sheet.id !== sheetId)
    saveTechSheets(updatedSheets)
    toast.success('Tech sheet deleted')
  }

  /**
   * Gets tech sheets statistics
   */
  const getTechSheetStats = () => {
    return {
      total: techSheets.length,
      manual: techSheets.filter(s => s.source === 'manual').length,
      fromBookings: techSheets.filter(s => s.source === 'booking').length,
      avgTime: techSheets.length > 0 
        ? Math.round((techSheets.reduce((sum, s) => sum + s.estimated_time, 0) / techSheets.length) * 10) / 10
        : 0
    }
  }

  /**
   * Gets tech sheets for a specific quote
   */
  const getTechSheetsForQuote = (quoteId: string) => {
    return techSheets.filter(sheet => sheet.quote_id === quoteId)
  }

  /**
   * Checks if API key is available for tech sheet generation
   */
  const canGenerateTechSheets = () => {
    return !!(serverSettings?.openai_configured || (settings?.openai_api_key && settings.openai_api_key.length > 10))
  }

  return {
    techSheets,
    isLoading,
    isGenerating,
    generateTechSheet,
    generateFromQuote,
    deleteTechSheet,
    getTechSheetStats,
    getTechSheetsForQuote,
    canGenerateTechSheets,
    refreshTechSheets: loadTechSheets
  }
}