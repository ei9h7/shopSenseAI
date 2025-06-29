import { OpenAIService } from './openai.js'
import { OpenPhoneService } from './openphone.js'

/**
 * Message Interface
 * Defines the structure of messages processed by the system
 */
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
  read?: boolean
}

/**
 * AI Response Interface
 * Defines the structure of responses from the AI processing system
 */
export interface AIResponse {
  reply: string
  intent: string
  action: string
}

// Simple in-memory storage for messages (in production, consider using a database)
let messageStore: Message[] = []

/**
 * MessageProcessor Class
 * 
 * The core message processing engine that handles incoming SMS messages,
 * processes them with AI, and sends appropriate responses. This class provides:
 * 
 * - AI-powered message processing with OpenAI GPT-4
 * - Intelligent fallback system when AI is unavailable
 * - Emergency message detection and prioritization
 * - SMS sending via OpenPhone integration
 * - Message storage and conversation management
 * - Do Not Disturb mode support
 * - Comprehensive error handling and logging
 * 
 * The processor ensures that customers never go without a response by
 * implementing multiple fallback layers when the primary AI system fails.
 */
export class MessageProcessor {
  private openAI: OpenAIService | null = null
  private openPhone: OpenPhoneService | null = null
  private settings: any = null

  /**
   * Initializes the message processor with API services
   * 
   * This method sets up the OpenAI and OpenPhone services using environment
   * variables. It gracefully handles missing API keys and provides detailed
   * logging for troubleshooting.
   */
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
        console.log(`📱 Using OpenPhone number: ${this.settings.phone_number}`)
        console.log(`🔑 OpenPhone API key: ${this.settings.openphone_api_key.substring(0, 8)}...`)
      } else {
        console.warn('⚠️  OpenPhone API key or phone number not found')
      }

      console.log('🤖 MessageProcessor initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize MessageProcessor:', error)
    }
  }

  /**
   * Processes an incoming SMS message
   * 
   * This is the main entry point for message processing. It handles:
   * - Message storage and logging
   * - DND (Do Not Disturb) checking
   * - AI processing with fallback systems
   * - Emergency detection and prioritization
   * - Response generation and sending
   * - Comprehensive error handling
   * 
   * @param phoneNumber - The customer's phone number
   * @param messageBody - The content of the SMS message
   */
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
        created_at: new Date().toISOString(),
        read: false
      }

      // Store message in memory (and log it)
      messageStore.unshift(message)
      console.log('📝 Message stored:', message)
      console.log(`📊 Total messages in store: ${messageStore.length}`)

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

        // Update the stored message with AI response data
        const messageIndex = messageStore.findIndex(m => m.id === message.id)
        if (messageIndex !== -1) {
          messageStore[messageIndex] = {
            ...messageStore[messageIndex],
            ai_response: aiResponse.reply,
            intent: aiResponse.intent,
            action: aiResponse.action,
            processed: true
          }
        }

        // Always try to send a response
        try {
          await this.sendResponse(phoneNumber, aiResponse, message.id)
          
          // Create outbound message record
          const outboundMessage: Message = {
            id: Date.now().toString() + '_out',
            phone_number: phoneNumber,
            body: aiResponse.reply,
            direction: 'outbound',
            timestamp: new Date().toISOString(),
            processed: true,
            created_at: new Date().toISOString(),
            read: true
          }
          
          messageStore.unshift(outboundMessage)
          console.log('📤 Outbound message stored:', outboundMessage)
          
          // Log action needed for manual follow-up
          if (aiResponse.action.includes('URGENT') || aiResponse.intent === 'Emergency') {
            console.log('🚨🚨🚨 URGENT ACTION REQUIRED 🚨🚨🚨')
            console.log(`📞 CALL ${phoneNumber} IMMEDIATELY`)
            console.log(`💬 Message: "${messageBody}"`)
            console.log('🚨🚨🚨 URGENT ACTION REQUIRED 🚨🚨🚨')
          }
        } catch (smsError) {
          console.error('❌ Failed to send SMS response:', smsError)
          
          // Log the failure but don't throw - we want to continue processing
          console.log('📝 MESSAGE PROCESSING SUMMARY:')
          console.log(`📱 From: ${phoneNumber}`)
          console.log(`💬 Message: "${messageBody}"`)
          console.log(`🤖 AI Response: "${aiResponse.reply}"`)
          console.log(`🎯 Intent: ${aiResponse.intent}`)
          console.log(`📋 Action: ${aiResponse.action}`)
          console.log('❌ SMS SENDING FAILED - MANUAL RESPONSE REQUIRED')
          
          if (aiResponse.intent === 'Emergency' || aiResponse.action.includes('URGENT')) {
            console.log('🚨🚨🚨 EMERGENCY - IMMEDIATE MANUAL RESPONSE REQUIRED 🚨🚨🚨')
          }
        }
      } else {
        console.error('❌ OpenPhone service not available - cannot send response')
        console.log('📝 MESSAGE RECEIVED BUT NO RESPONSE CAPABILITY:')
        console.log(`📱 From: ${phoneNumber}`)
        console.log(`💬 Message: "${messageBody}"`)
        console.log('⚠️  MANUAL RESPONSE REQUIRED')
      }
    } catch (error) {
      console.error('❌ Error processing message:', error)
      
      // Log the message details for manual follow-up
      console.log('📝 MESSAGE PROCESSING FAILED:')
      console.log(`📱 From: ${phoneNumber}`)
      console.log(`💬 Message: "${messageBody}"`)
      console.log('⚠️  MANUAL RESPONSE REQUIRED')
      
      // Don't throw the error - we want the webhook to return 200 to OpenPhone
    }
  }

  /**
   * Retrieves all stored messages
   * Used by the API endpoint to provide message history to the frontend
   */
  getMessages(): Message[] {
    return [...messageStore].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  /**
   * Marks a message as read
   * Updates the message status for conversation management
   */
  markMessageAsRead(messageId: string): void {
    const messageIndex = messageStore.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      messageStore[messageIndex].read = true
    }
  }

  /**
   * Sends a manual reply via SMS
   * Used when staff need to send custom responses to customers
   */
  async sendManualReply(phoneNumber: string, message: string): Promise<void> {
    if (!this.openPhone) {
      throw new Error('OpenPhone service not initialized')
    }

    await this.openPhone.sendSMS(phoneNumber, message)
    
    // Store the outbound message
    const outboundMessage: Message = {
      id: Date.now().toString() + '_manual',
      phone_number: phoneNumber,
      body: message,
      direction: 'outbound',
      timestamp: new Date().toISOString(),
      processed: true,
      created_at: new Date().toISOString(),
      read: true
    }
    
    messageStore.unshift(outboundMessage)
    console.log('📤 Manual reply sent and stored:', outboundMessage)
  }

  /**
   * Generates intelligent fallback responses when AI is unavailable
   * 
   * This system uses keyword detection to provide appropriate responses
   * even when the OpenAI API is down, has no credits, or encounters errors.
   * This ensures customers always receive professional responses.
   */
  private getEmergencyFallback(messageBody: string): AIResponse {
    // Intelligent fallback logic when AI is unavailable
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
        reply: "🚨 EMERGENCY RECEIVED! I got your urgent message and will respond immediately. If you're in immediate danger, please call 911. Otherwise, I'll contact you within 15 minutes. Stay safe!",
        intent: "Emergency",
        action: "URGENT - Contact customer immediately"
      }
    }
    
    // Service/maintenance requests
    if (lowerMessage.includes('oil change') || 
        lowerMessage.includes('service') || 
        lowerMessage.includes('maintenance') ||
        lowerMessage.includes('tune up') ||
        lowerMessage.includes('inspection')) {
      return {
        reply: "Hi! Thanks for reaching out about service. I'd be happy to help with your vehicle maintenance. My rate is $80/hr with a 1-hour minimum. I'll get back to you shortly with more details!",
        intent: "Service Request",
        action: "Follow up with service quote"
      }
    }
    
    // Quote requests
    if (lowerMessage.includes('quote') || 
        lowerMessage.includes('price') || 
        lowerMessage.includes('cost') ||
        lowerMessage.includes('estimate') ||
        lowerMessage.includes('how much')) {
      return {
        reply: "Thanks for your quote request! I'd be happy to provide an estimate. My labor rate is $80/hr with a 1-hour minimum. I'll review your message and get back to you with a detailed quote soon.",
        intent: "Quote Request",
        action: "Prepare detailed quote"
      }
    }
    
    // Repair/problem descriptions
    if (lowerMessage.includes('problem') || 
        lowerMessage.includes('issue') || 
        lowerMessage.includes('broken') ||
        lowerMessage.includes('noise') ||
        lowerMessage.includes('leak') ||
        lowerMessage.includes('won\'t start') ||
        lowerMessage.includes('not working')) {
      return {
        reply: "I received your message about the issue with your vehicle. I'll take a look at what you've described and get back to you with next steps. My diagnostic rate is $80/hr. Thanks for reaching out!",
        intent: "Repair Request",
        action: "Diagnose issue and provide solution"
      }
    }
    
    // Booking/appointment requests
    if (lowerMessage.includes('appointment') || 
        lowerMessage.includes('schedule') || 
        lowerMessage.includes('book') ||
        lowerMessage.includes('available') ||
        lowerMessage.includes('when can')) {
      return {
        reply: "Thanks for wanting to schedule service! I'll check my availability and get back to you with some time options. My rate is $80/hr with a 1-hour minimum. Looking forward to helping you!",
        intent: "Booking Request",
        action: "Check schedule and offer appointment times"
      }
    }
    
    // Default response for any other message
    return {
      reply: "Hi! Thanks for your message. I'm Pink Chicken Speed Shop and I received your inquiry. I'll review it and get back to you personally within the hour. My rate is $80/hr. Thanks for choosing us!",
      intent: "General Inquiry",
      action: "Review message and provide personalized response"
    }
  }

  /**
   * Sends an SMS response to the customer
   * 
   * This method handles the actual SMS sending via OpenPhone API
   * with comprehensive error handling and logging.
   */
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
      
      // Check if it's an authentication error
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('🔑 OPENPHONE API AUTHENTICATION FAILED!')
        console.error('   - Check if your OpenPhone API key is valid')
        console.error('   - Verify the API key has SMS sending permissions')
        console.error('   - Ensure the phone number is correctly configured')
        console.error(`   - Current API key: ${this.settings?.openphone_api_key?.substring(0, 8)}...`)
        console.error(`   - Current phone number: ${this.settings?.phone_number}`)
      }
      
      throw error
    }
  }

  /**
   * Checks if a message intent indicates an emergency
   * Used for prioritizing urgent messages and alerts
   */
  private isEmergency(intent: string): boolean {
    const emergencyKeywords = ['emergency', 'urgent', 'breakdown', 'stranded', 'accident']
    return emergencyKeywords.some(keyword => 
      intent.toLowerCase().includes(keyword)
    )
  }

  /**
   * Checks if Do Not Disturb mode is enabled
   * When DND is enabled, the system automatically processes and responds to messages
   * When disabled, messages are stored but no automatic responses are sent
   */
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