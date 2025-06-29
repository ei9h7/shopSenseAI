import { OpenAIService } from './openai'
import { OpenPhoneService } from './openphone'
import type { Message, BusinessSettings, AIResponse } from '../types'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Toast function that works in both environments
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (isBrowser) {
    // Dynamic import to avoid server-side issues
    import('react-hot-toast').then(({ default: toast }) => {
      if (type === 'error') {
        toast.error(message)
      } else {
        toast.success(message)
      }
    }).catch(() => {
      console.log(`Toast: ${message}`)
    })
  } else {
    console.log(`${type.toUpperCase()}: ${message}`)
  }
}

export class MessageProcessor {
  private openAI: OpenAIService | null = null
  private openPhone: OpenPhoneService | null = null
  private settings: BusinessSettings | null = null

  async initialize() {
    try {
      if (isBrowser) {
        // Browser environment - use localStorage
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
      } else {
        // Server environment - use environment variables
        this.settings = {
          business_name: process.env.BUSINESS_NAME || 'Pink Chicken Speed Shop',
          labor_rate: parseInt(process.env.LABOR_RATE || '80'),
          openai_api_key: process.env.OPENAI_API_KEY || '',
          openphone_api_key: process.env.OPENPHONE_API_KEY || '',
          phone_number: process.env.OPENPHONE_PHONE_NUMBER || '',
          dnd_enabled: process.env.DND_ENABLED === 'true'
        }
        
        // Initialize services if API keys are available
        if (this.settings.openai_api_key) {
          this.openAI = new OpenAIService(this.settings.openai_api_key)
        }
        
        if (this.settings.openphone_api_key && this.settings.phone_number) {
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

      // Store message
      this.storeMessage(message)

      // Check if Do Not Disturb is enabled
      const isDndEnabled = await this.isDndEnabled()
      
      if (!isDndEnabled) {
        // Just store the message, don't auto-respond
        showToast('New message received')
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
          showToast('Emergency message received!', 'error')
          
          // Still send AI response but also alert
          await this.sendResponse(phoneNumber, aiResponse, message.id)
        } else {
          // Send AI response
          await this.sendResponse(phoneNumber, aiResponse, message.id)
        }
      }
    } catch (error) {
      console.error('Error processing message:', error)
      showToast('Failed to process incoming message', 'error')
    }
  }

  private storeMessage(message: Message): void {
    if (isBrowser) {
      // Browser environment - use localStorage
      const savedMessages = localStorage.getItem('messages')
      const messages = savedMessages ? JSON.parse(savedMessages) : []
      messages.unshift(message)
      localStorage.setItem('messages', JSON.stringify(messages))
    } else {
      // Server environment - just log for now
      console.log('Message stored:', message)
    }
  }

  private updateMessages(messages: Message[]): void {
    if (isBrowser) {
      localStorage.setItem('messages', JSON.stringify(messages))
    } else {
      console.log('Messages updated:', messages.length, 'total messages')
    }
  }

  private getMessages(): Message[] {
    if (isBrowser) {
      const savedMessages = localStorage.getItem('messages')
      return savedMessages ? JSON.parse(savedMessages) : []
    } else {
      // Server environment - return empty array for now
      return []
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

      // Update messages
      const messages = this.getMessages()
      
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

      this.updateMessages(messages)
      showToast('AI response sent successfully')
    } catch (error) {
      console.error('Error sending response:', error)
      showToast('Failed to send AI response', 'error')
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
      if (isBrowser) {
        const savedSettings = localStorage.getItem('business-settings')
        if (savedSettings) {
          const settings = JSON.parse(savedSettings)
          return settings?.dnd_enabled || false
        }
      } else {
        // Server environment - use environment variable
        return process.env.DND_ENABLED === 'true'
      }
      return false
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const messageProcessor = new MessageProcessor()