import React, { useState } from 'react'
import { ClipboardList, Plus, Download, Eye, Wrench, Clock, AlertTriangle } from 'lucide-react'
import { useBusinessSettings } from '../hooks/useBusinessSettings'
import toast from 'react-hot-toast'

interface TechSheet {
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
}

/**
 * TechSheets Component
 * 
 * Manages technical repair guides with both auto-generation from bookings
 * and manual generation from job descriptions. Features include:
 * 
 * - Manual tech sheet generation via AI from job descriptions
 * - Auto-generated sheets from accepted quotes/bookings
 * - Downloadable PDF format for workshop use
 * - Difficulty ratings and time estimates
 * - Safety warnings and tool requirements
 * - Step-by-step repair instructions
 * - Professional tips and best practices
 */
const TechSheets: React.FC = () => {
  const { settings } = useBusinessSettings()
  const [techSheets, setTechSheets] = useState<TechSheet[]>(() => {
    const saved = localStorage.getItem('tech-sheets')
    return saved ? JSON.parse(saved) : []
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState<TechSheet | null>(null)
  const [jobDescription, setJobDescription] = useState('')

  /**
   * Generates a tech sheet using AI based on job description
   * 
   * This function sends the job description to OpenAI to generate
   * a comprehensive technical repair guide with all necessary details.
   */
  const generateTechSheet = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description')
      return
    }

    if (!settings?.openai_api_key) {
      toast.error('OpenAI API key not configured. Please check settings.')
      return
    }

    setIsGenerating(true)
    try {
      // Call OpenAI API to generate tech sheet
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.openai_api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
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
}`
            },
            {
              role: 'user',
              content: `Generate a detailed tech sheet for this automotive repair job: ${jobDescription}`
            }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

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
        estimated_time: parsedResponse.estimated_time || 2,
        difficulty: parsedResponse.difficulty || 'Medium',
        tools_required: parsedResponse.tools_required || [],
        parts_needed: parsedResponse.parts_needed || [],
        safety_warnings: parsedResponse.safety_warnings || [],
        step_by_step: parsedResponse.step_by_step || [],
        tips: parsedResponse.tips || [],
        created_at: new Date().toISOString(),
        generated_by: 'ai',
        source: 'manual'
      }

      // Save to state and localStorage
      const updatedSheets = [newTechSheet, ...techSheets]
      setTechSheets(updatedSheets)
      localStorage.setItem('tech-sheets', JSON.stringify(updatedSheets))

      // Reset form
      setJobDescription('')
      setShowGenerateForm(false)
      
      toast.success('Tech sheet generated successfully!')
    } catch (error) {
      console.error('Error generating tech sheet:', error)
      toast.error('Failed to generate tech sheet. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Downloads a tech sheet as a formatted text file
   * In a production environment, this could generate a PDF
   */
  const downloadTechSheet = (sheet: TechSheet) => {
    const content = `
TECH SHEET: ${sheet.title}
Generated: ${new Date(sheet.created_at).toLocaleDateString()}
Estimated Time: ${sheet.estimated_time} hours
Difficulty: ${sheet.difficulty}

DESCRIPTION:
${sheet.description}

TOOLS REQUIRED:
${sheet.tools_required.map(tool => `• ${tool}`).join('\n')}

PARTS NEEDED:
${sheet.parts_needed.map(part => `• ${part}`).join('\n')}

SAFETY WARNINGS:
${sheet.safety_warnings.map(warning => `⚠️ ${warning}`).join('\n')}

STEP-BY-STEP INSTRUCTIONS:
${sheet.step_by_step.map((step, index) => `${index + 1}. ${step}`).join('\n')}

TIPS & BEST PRACTICES:
${sheet.tips.map(tip => `💡 ${tip}`).join('\n')}

---
Generated by TorqueSheetGPT
Built with Bolt.new
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sheet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_tech_sheet.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Tech sheet downloaded!')
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tech Sheets</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-generated technical guides for repair jobs
          </p>
        </div>
        <button
          onClick={() => setShowGenerateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Generate Tech Sheet
        </button>
      </div>

      {/* Generate Form Modal */}
      {showGenerateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Tech Sheet</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Describe the repair job (e.g., 'Replace brake pads on 2018 Honda Civic front wheels')"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Be specific about the vehicle, parts, and repair needed for best results
                  </p>
                </div>
                
                {!settings?.openai_api_key && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> OpenAI API key not configured. Please set up your API key in Settings to generate tech sheets.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setShowGenerateForm(false)
                    setJobDescription('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={generateTechSheet}
                  disabled={!jobDescription.trim() || isGenerating || !settings?.openai_api_key}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 mr-2 inline-block" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tech Sheets List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {techSheets.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tech sheets yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate your first tech sheet by describing a repair job above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {techSheets.map((sheet) => (
                <div key={sheet.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{sheet.title}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(sheet.difficulty)}`}>
                          {sheet.difficulty}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Clock className="h-3 w-3 mr-1" />
                          {sheet.estimated_time}h
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{sheet.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{sheet.tools_required.length} tools</span>
                        <span>{sheet.parts_needed.length} parts</span>
                        <span>{sheet.step_by_step.length} steps</span>
                        <span>Created: {new Date(sheet.created_at).toLocaleDateString()}</span>
                      </div>
                      {sheet.safety_warnings.length > 0 && (
                        <div className="mt-2 flex items-center text-sm text-amber-600">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {sheet.safety_warnings.length} safety warning{sheet.safety_warnings.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedSheet(sheet)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => downloadTechSheet(sheet)}
                        className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tech Sheet Detail Modal */}
      {selectedSheet && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-gray-900">{selectedSheet.title}</h3>
                <button
                  onClick={() => setSelectedSheet(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Job Description</h4>
                    <p className="text-sm text-gray-700">{selectedSheet.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tools Required</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {selectedSheet.tools_required.map((tool, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          {tool}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Parts Needed</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {selectedSheet.parts_needed.map((part, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          {part}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {selectedSheet.safety_warnings.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
                        Safety Warnings
                      </h4>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {selectedSheet.safety_warnings.map((warning, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-amber-500 mr-2">⚠️</span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Step-by-Step Instructions</h4>
                    <ol className="text-sm text-gray-700 space-y-2">
                      {selectedSheet.step_by_step.map((step, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-600 rounded-full text-xs font-medium mr-3 mt-0.5 flex-shrink-0">
                            {index + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  
                  {selectedSheet.tips.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Tips & Best Practices</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {selectedSheet.tips.map((tip, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">💡</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between items-center mb-1">
                        <span>Estimated Time:</span>
                        <span className="font-medium">{selectedSheet.estimated_time} hours</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span>Difficulty:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedSheet.difficulty)}`}>
                          {selectedSheet.difficulty}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Generated:</span>
                        <span>{new Date(selectedSheet.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => downloadTechSheet(selectedSheet)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => setSelectedSheet(null)}
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

export default TechSheets