import { OpenAIService } from './openai'
import { OpenPhoneService } from './openphone'
import type { Message, BusinessSettings, AIResponse } from '../types'
import toast from 'react-hot-toast'

export class MessageProcessor {
  private openAI: OpenAIService | null = null
  private openPhone: OpenPhoneService | null = null
  private settings: BusinessSettings | null = null

  async initialize() {
    try {
      // Get business settings from localStorage
      const savedSettings = localStorage.getItem('business-settings')
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings)
        
        // Initialize services if API keys are available
        if (this.settings?.openai_api_key) {
          this.openAI = new OpenAIService(this.settings.openai_api_key)
        }
        
        if (this.settings?.openphone_api_key && this.settings?.phone_number) {
          this.openPhone = new OpenPhoneService(this.settings.openphone_api_key, this.settings.phone_number)
        }
      }
    } catch (error) {
      console.error('Failed to initialize MessageProcessor:', error)
    }
  }

  async processIncomingMessage(phoneNumber: string, messageBody: string): Promise<void> {
    try {
      // Create new message object
      const message: Message = {
        id: Date.now().toString(),
        phone_number: phoneNumber,
        body: messageBody,
        direction: 'inbound',
        timestamp: new Date().toISOString(),
        processed: false,
        created_at: new Date().toISOString()
      }

      // Store message in localStorage
      const savedMessages = localStorage.getItem('messages')
      const messages = savedMessages ? JSON.parse(savedMessages) : []
      messages.unshift(message)
      localStorage.setItem('messages', JSON.stringify(messages))

      // Check if Do Not Disturb is enabled
      const isDndEnabled = await this.isDndEnabled()
      
      if (!isDndEnabled) {
        // Just store the message, don't auto-respond
        toast.success('New message received')
        return
      }

      // Process with AI if services are available
      if (this.openAI && this.openPhone && this.settings) {
        const aiResponse = await this.openAI.processMessage(
          messageBody, 
          this.settings.business_name
        )

        // Check if it's an emergency
        if (this.isEmergency(aiResponse.intent)) {
          // Override DND for emergencies
          toast.error('Emergency message received!', {
            duration: 10000,
            style: {
              background: '#ef4444',
              color: '#fff',
            }
          })
          
          // Still send AI response but also alert
          await this.sendResponse(phoneNumber, aiResponse, message.id)
        } else {
          // Send AI response
          await this.sendResponse(phoneNumber, aiResponse, message.id)
        }
      }
    } catch (error) {
      console.error('Error processing message:', error)
      toast.error('Failed to process incoming message')
    }
  }

  private async sendResponse(phoneNumber: string, aiResponse: AIResponse, messageId: string): Promise<void> {
    if (!this.openPhone) {
      throw new Error('OpenPhone service not initialized')
    }

    try {
      // Send SMS response
      await this.openPhone.sendSMS(phoneNumber, aiResponse.reply)

      // Create outbound message
      const outboundMessage: Message = {
        id: Date.now().toString() + '_out',
        phone_number: phoneNumber,
        body: aiResponse.reply,
        direction: 'outbound',
        timestamp: new Date().toISOString(),
        processed: true,
        created_at: new Date().toISOString()
      }

      // Update messages in localStorage
      const savedMessages = localStorage.getItem('messages')
      const messages = savedMessages ? JSON.parse(savedMessages) : []
      
      // Add outbound message
      messages.unshift(outboundMessage)
      
      // Update original message with AI response data
      const messageIndex = messages.findIndex((m: Message) => m.id === messageId)
      if (messageIndex !== -1) {
        messages[messageIndex] = {
          ...messages[messageIndex],
          processed: true,
          ai_response: aiResponse.reply,
          intent: aiResponse.intent,
          action: aiResponse.action
        }
      }

      localStorage.setItem('messages', JSON.stringify(messages))
      toast.success('AI response sent successfully')
    } catch (error) {
      console.error('Error sending response:', error)
      toast.error('Failed to send AI response')
    }
  }

  private isEmergency(intent: string): boolean {
    const emergencyKeywords = ['emergency', 'urgent', 'breakdown', 'stranded', 'accident']
    return emergencyKeywords.some(keyword => 
      intent.toLowerCase().includes(keyword)
    )
  }

  private async isDndEnabled(): Promise<boolean> {
    try {
      const savedSettings = localStorage.getItem('business-settings')
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        return settings?.dnd_enabled || false
      }
      return false
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const messageProcessor = new MessageProcessor()