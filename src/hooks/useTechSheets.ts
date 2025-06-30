import { useState, useEffect } from 'react'
import { useBusinessSettings } from './useBusinessSettings'
import { generateTechSheetPDF } from '../utils/pdfGenerator'
import { API_BASE_URL } from '../utils/api'
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
 * - Professional PDF generation with ShopSenseAI branding
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
   * Creates a fallback tech sheet when AI generation fails
   */
  const createFallbackTechSheet = (jobDescription: string, vehicleInfo?: string, customerName?: string, quoteId?: string): TechSheet => {
    // Create a basic tech sheet based on common automotive repair patterns
    const lowerDesc = jobDescription.toLowerCase()
    
    let title = jobDescription.substring(0, 50)
    let estimatedTime = 2
    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
    let tools = ['Basic hand tools', 'Socket set', 'Wrench set']
    let parts = ['As specified in job description']
    let safety = ['Wear safety glasses', 'Use proper lifting techniques', 'Ensure vehicle is secure']
    let steps = [
      'Assess the vehicle and confirm the issue',
      'Gather all required tools and parts',
      'Follow manufacturer specifications',
      'Perform the repair work carefully',
      'Test functionality after completion',
      'Clean up work area and dispose of waste properly'
    ]
    let tips = ['Take photos before disassembly', 'Keep parts organized', 'Refer to service manual']

    // Customize based on job type
    if (lowerDesc.includes('brake')) {
      title = `Brake Service - ${vehicleInfo || 'Vehicle'}`
      estimatedTime = 1.5
      difficulty = 'Medium'
      tools = ['Brake tools', 'C-clamp', 'Socket set', 'Torque wrench']
      parts = ['Brake pads', 'Brake fluid', 'Hardware kit']
      safety = ['Never work under vehicle without proper support', 'Brake fluid is corrosive', 'Test brakes before driving']
      steps = [
        'Lift vehicle and remove wheels',
        'Inspect brake system components',
        'Remove old brake pads',
        'Clean and lubricate caliper slides',
        'Install new brake pads',
        'Bleed brake system if needed',
        'Test brake pedal feel and function'
      ]
      tips = ['Always replace pads in pairs', 'Check rotor condition', 'Pump brakes before driving']
    } else if (lowerDesc.includes('oil')) {
      title = `Oil Change - ${vehicleInfo || 'Vehicle'}`
      estimatedTime = 0.5
      difficulty = 'Easy'
      tools = ['Oil drain pan', 'Socket wrench', 'Oil filter wrench', 'Funnel']
      parts = ['Engine oil', 'Oil filter', 'Drain plug gasket']
      safety = ['Engine may be hot', 'Dispose of oil properly', 'Wear gloves']
      steps = [
        'Warm engine to operating temperature',
        'Lift vehicle and locate drain plug',
        'Drain old oil completely',
        'Replace oil filter',
        'Install new drain plug with gasket',
        'Lower vehicle and add new oil',
        'Check oil level and for leaks'
      ]
      tips = ['Use correct oil viscosity', 'Reset oil life monitor', 'Keep maintenance records']
    } else if (lowerDesc.includes('tire') || lowerDesc.includes('wheel')) {
      title = `Tire/Wheel Service - ${vehicleInfo || 'Vehicle'}`
      estimatedTime = 1
      difficulty = 'Easy'
      tools = ['Tire iron', 'Jack', 'Jack stands', 'Torque wrench']
      parts = ['Tires', 'Valve stems', 'Wheel weights']
      safety = ['Never work under vehicle supported only by jack', 'Check tire pressure when cold', 'Inspect for damage']
      steps = [
        'Loosen lug nuts while wheel is on ground',
        'Lift vehicle and secure with jack stands',
        'Remove wheel completely',
        'Inspect tire and wheel condition',
        'Mount new tire if needed',
        'Balance wheel assembly',
        'Install wheel and torque to specification'
      ]
      tips = ['Rotate tires regularly', 'Check alignment if wear is uneven', 'Keep spare tire inflated']
    }

    return {
      id: Date.now().toString(),
      title,
      description: jobDescription,
      vehicle_info: vehicleInfo,
      customer_name: customerName,
      estimated_time: estimatedTime,
      difficulty,
      tools_required: tools,
      parts_needed: parts,
      safety_warnings: safety,
      step_by_step: steps,
      tips,
      created_at: new Date().toISOString(),
      generated_by: 'manual',
      source: customerName ? 'booking' : 'manual',
      quote_id: quoteId
    }
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
      console.log('⚠️ No API key available, creating fallback tech sheet')
      const fallbackSheet = createFallbackTechSheet(jobDescription, vehicleInfo, customerName, quoteId)
      const updatedSheets = [fallbackSheet, ...techSheets]
      saveTechSheets(updatedSheets)
      toast.success('Tech sheet created (basic template)')
      return fallbackSheet
    }

    setIsGenerating(true)
    try {
      const prompt = vehicleInfo 
        ? `${jobDescription} for ${vehicleInfo}`
        : jobDescription

      let aiResponse: string

      if (apiKey === 'server-configured') {
        // Use server-side API when key is configured on server
        console.log('🔧 Using server-side API for tech sheet generation...')
        const response = await fetch(`${API_BASE_URL}/api/generate-tech-sheet`, {
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
          const errorText = await response.text()
          console.error('Server API error:', response.status, errorText)
          throw new Error(`Server API error: ${response.status}`)
        }

        const data = await response.json()
        aiResponse = data.content
        console.log('✅ Server-side tech sheet generation successful')
      } else {
        // Use client-side API when key is configured locally
        console.log('🔧 Using client-side API for tech sheet generation...')
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
          const errorData = await response.json().catch(() => ({}))
          console.error('OpenAI API error:', response.status, errorData)
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
        }

        const data = await response.json()
        aiResponse = data.choices[0]?.message?.content || ''
        console.log('✅ Client-side tech sheet generation successful')
      }

      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      // Parse the AI response
      let parsedResponse
      try {
        // Clean up the response in case it has markdown formatting
        const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        parsedResponse = JSON.parse(cleanResponse)
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON, using fallback:', parseError)
        console.log('AI Response was:', aiResponse)
        
        // Create fallback with AI response as description
        const fallbackSheet = createFallbackTechSheet(jobDescription, vehicleInfo, customerName, quoteId)
        const updatedSheets = [fallbackSheet, ...techSheets]
        saveTechSheets(updatedSheets)
        toast.success('Tech sheet created (AI response could not be parsed)')
        return fallbackSheet
      }

      // Validate required fields
      if (!parsedResponse.title || !parsedResponse.step_by_step) {
        console.warn('AI response missing required fields, using fallback')
        const fallbackSheet = createFallbackTechSheet(jobDescription, vehicleInfo, customerName, quoteId)
        const updatedSheets = [fallbackSheet, ...techSheets]
        saveTechSheets(updatedSheets)
        toast.success('Tech sheet created (AI response incomplete)')
        return fallbackSheet
      }

      // Create new tech sheet with AI data
      const newTechSheet: TechSheet = {
        id: Date.now().toString(),
        title: parsedResponse.title,
        description: jobDescription,
        vehicle_info: vehicleInfo,
        customer_name: customerName,
        estimated_time: parsedResponse.estimated_time || 2,
        difficulty: parsedResponse.difficulty || 'Medium',
        tools_required: Array.isArray(parsedResponse.tools_required) ? parsedResponse.tools_required : ['Basic hand tools'],
        parts_needed: Array.isArray(parsedResponse.parts_needed) ? parsedResponse.parts_needed : ['As needed'],
        safety_warnings: Array.isArray(parsedResponse.safety_warnings) ? parsedResponse.safety_warnings : ['Follow safety procedures'],
        step_by_step: Array.isArray(parsedResponse.step_by_step) ? parsedResponse.step_by_step : ['Follow standard procedures'],
        tips: Array.isArray(parsedResponse.tips) ? parsedResponse.tips : ['Refer to service manual'],
        created_at: new Date().toISOString(),
        generated_by: 'ai',
        source: customerName ? 'booking' : 'manual',
        quote_id: quoteId
      }

      // Save to storage
      const updatedSheets = [newTechSheet, ...techSheets]
      saveTechSheets(updatedSheets)

      console.log('✅ Tech sheet generated successfully:', newTechSheet.title)
      toast.success('AI tech sheet generated successfully!')
      return newTechSheet
    } catch (error) {
      console.error('Error generating tech sheet with AI:', error)
      
      // Create fallback tech sheet instead of failing completely
      console.log('🔄 Creating fallback tech sheet due to AI error')
      const fallbackSheet = createFallbackTechSheet(jobDescription, vehicleInfo, customerName, quoteId)
      const updatedSheets = [fallbackSheet, ...techSheets]
      saveTechSheets(updatedSheets)
      
      toast.error('AI generation failed, created basic tech sheet instead')
      return fallbackSheet
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
   * Downloads a tech sheet as a branded PDF
   */
  const downloadTechSheetPDF = async (sheet: TechSheet) => {
    try {
      await generateTechSheetPDF(sheet)
      toast.success('PDF tech sheet downloaded!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    }
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
   * Returns true even if no API key (fallback sheets available)
   */
  const canGenerateTechSheets = () => {
    return true // Always return true since we have fallback capability
  }

  /**
   * Checks if AI-powered generation is available
   */
  const hasAIGeneration = () => {
    return !!(serverSettings?.openai_configured || (settings?.openai_api_key && settings.openai_api_key.length > 10))
  }

  return {
    techSheets,
    isLoading,
    isGenerating,
    generateTechSheet,
    generateFromQuote,
    downloadTechSheetPDF,
    deleteTechSheet,
    getTechSheetStats,
    getTechSheetsForQuote,
    canGenerateTechSheets,
    hasAIGeneration,
    refreshTechSheets: loadTechSheets
  }
}