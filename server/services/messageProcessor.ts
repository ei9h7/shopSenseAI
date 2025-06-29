import { OpenAIService } from './openai.js'
import { OpenPhoneService } from './openphone.js'

export interface Message {
  id: string
  phone_number: string
  body: string
  direction: 'inbound' | 'outbound'
  timestamp: string
  processed: boolean
  ai_response?: string
  intent?: string
  action?: string
  created_at: string
}

export interface AIResponse {
  reply: string
  intent: string
  action: string
}

export class MessageProcessor {
  private openAI: OpenAIService | null = null
  private openPhone: OpenPhoneService | null = null
  private settings: any = null

  async initialize() {
    try {
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
        console.log('✅ OpenAI service initialized')
      } else {
        console.warn('⚠️  OpenAI API key not found')
      }
      
      if (this.settings.openphone_api_key && this.settings.phone_number) {
        this.openPhone = new OpenPhoneService(this.settings.openphone_api_key, this.settings.phone_number)
        console.log('✅ OpenPhone service initialized')
      } else {
        console.warn('⚠️  OpenPhone API key or phone number not found')
      }

      console.log('🤖 MessageProcessor initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize MessageProcessor:', error)
    }
  }

  async processIncomingMessage(phoneNumber: string, messageBody: string): Promise<void> {
    try {
      console.log(`📨 Processing message from ${phoneNumber}: ${messageBody}`)

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

      // Log message received
      console.log('📝 Message stored:', message)

      // Check if Do Not Disturb is enabled
      const isDndEnabled = await this.isDndEnabled()
      console.log(`🔕 DND Status: ${isDndEnabled ? 'Enabled' : 'Disabled'}`)
      
      if (!isDndEnabled) {
        // Just store the message, don't auto-respond
        console.log('✅ Message received (no auto-response - DND disabled)')
        return
      }

      // Always try to send a response when DND is enabled
      if (this.openPhone) {
        let aiResponse: AIResponse

        // Try AI processing first
        if (this.openAI && this.settings) {
          try {
            console.log('🤖 Attempting AI processing...')
            aiResponse = await this.openAI.processMessage(
              messageBody, 
              this.settings.business_name
            )
            console.log('🎯 AI Response successful:', aiResponse)
          } catch (aiError) {
            console.error('❌ AI processing failed, using emergency fallback:', aiError)
            
            // Emergency fallback when AI completely fails
            aiResponse = this.getEmergencyFallback(messageBody)
          }
        } else {
          console.log('⚠️  AI service not available, using emergency fallback')
          aiResponse = this.getEmergencyFallback(messageBody)
        }

        // Always send a response
        await this.sendResponse(phoneNumber, aiResponse, message.id)
        
        // Log action needed for manual follow-up
        if (aiResponse.action.includes('URGENT') || aiResponse.intent === 'Emergency') {
          console.log('🚨🚨🚨 URGENT ACTION REQUIRED 🚨🚨🚨')
          console.log(`📞 CALL ${phoneNumber} IMMEDIATELY`)
          console.log(`💬 Message: "${messageBody}"`)
          console.log('🚨🚨🚨 URGENT ACTION REQUIRED 🚨🚨🚨')
        }
      } else {
        console.error('❌ OpenPhone service not available - cannot send response')
      }
    } catch (error) {
      console.error('❌ Error processing message:', error)
      
      // Last resort: try to send a basic acknowledgment
      if (this.openPhone) {
        try {
          await this.openPhone.sendSMS(
            phoneNumber, 
            "Message received! I'll get back to you soon. If urgent, please call me directly."
          )
          console.log('✅ Sent emergency acknowledgment')
        } catch (smsError) {
          console.error('❌ Failed to send emergency acknowledgment:', smsError)
        }
      }
      
      throw error
    }
  }

  private getEmergencyFallback(messageBody: string): AIResponse {
    const lowerMessage = messageBody.toLowerCase()
    
    // Check for emergency keywords
    if (lowerMessage.includes('emergency') || 
        lowerMessage.includes('urgent') || 
        lowerMessage.includes('breakdown') ||
        lowerMessage.includes('stranded') ||
        lowerMessage.includes('accident') ||
        lowerMessage.includes('help') ||
        lowerMessage.includes('stuck')) {
      return {
        reply: "🚨 EMERGENCY RECEIVED! I got your urgent message. If you're in immediate danger, call 911. Otherwise, I'll contact you within 15 minutes. Stay safe!",
        intent: "Emergency",
        action: "URGENT - Contact customer immediately"
      }
    }
    
    // Default safe response
    return {
      reply: "Thanks for your message! I received it and will get back to you personally within the hour. If this is urgent, please call me directly.",
      intent: "General Inquiry",
      action: "Manual review and response needed"
    }
  }

  private async sendResponse(phoneNumber: string, aiResponse: AIResponse, messageId: string): Promise<void> {
    if (!this.openPhone) {
      throw new Error('OpenPhone service not initialized')
    }

    try {
      console.log(`📤 Sending response to ${phoneNumber}: ${aiResponse.reply}`)
      
      // Send SMS response
      await this.openPhone.sendSMS(phoneNumber, aiResponse.reply)

      console.log('✅ Response sent successfully')
      
      // Log the action for manual follow-up
      console.log(`📋 Action required: ${aiResponse.action}`)
    } catch (error) {
      console.error('❌ Error sending response:', error)
      throw error
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
      // Server environment - use environment variable
      return process.env.DND_ENABLED === 'true'
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const messageProcessor = new MessageProcessor()