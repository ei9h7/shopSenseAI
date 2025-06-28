import { OpenAIService } from './openai'
import { OpenPhoneService } from './openphone'
import { supabase } from './supabase'
import type { Message, BusinessSettings, AIResponse } from '../types'
import toast from 'react-hot-toast'

export class MessageProcessor {
  private openAI: OpenAIService | null = null
  private openPhone: OpenPhoneService | null = null
  private settings: BusinessSettings | null = null

  async initialize() {
    try {
      // Get business settings from Supabase
      const { data: settings, error } = await supabase
        .from('business_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (settings) {
        this.settings = settings
        
        // Initialize services if API keys are available
        if (settings.openai_api_key) {
          this.openAI = new OpenAIService(settings.openai_api_key)
        }
        
        if (settings.openphone_api_key && settings.phone_number) {
          this.openPhone = new OpenPhoneService(settings.openphone_api_key, settings.phone_number)
        }
      }
    } catch (error) {
      console.error('Failed to initialize MessageProcessor:', error)
    }
  }

  async processIncomingMessage(phoneNumber: string, messageBody: string): Promise<void> {
    try {
      // Store incoming message
      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          phone_number: phoneNumber,
          body: messageBody,
          direction: 'inbound',
          timestamp: new Date().toISOString(),
          processed: false
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

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

      // Store outbound message
      await supabase.from('messages').insert({
        phone_number: phoneNumber,
        body: aiResponse.reply,
        direction: 'outbound',
        timestamp: new Date().toISOString(),
        processed: true
      })

      // Update original message with AI response data
      await supabase
        .from('messages')
        .update({
          processed: true,
          ai_response: aiResponse.reply,
          intent: aiResponse.intent,
          action: aiResponse.action
        })
        .eq('id', messageId)

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
      const { data, error } = await supabase
        .from('business_settings')
        .select('dnd_enabled')
        .single()

      if (error) return false
      return data?.dnd_enabled || false
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const messageProcessor = new MessageProcessor()