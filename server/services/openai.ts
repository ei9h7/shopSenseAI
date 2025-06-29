import axios from 'axios'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  reply: string
  intent: string
  action: string
}

export class OpenAIService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async processMessage(messageBody: string, businessName: string = 'Pink Chicken Speed Shop'): Promise<AIResponse> {
    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: `You are a professional, friendly assistant for ${businessName}. Use the rules provided to give quotes, book jobs, or respond to client requests.`
        },
        {
          role: 'user',
          content: `Here is the client message:\n\n"${messageBody}"\n\nYour job is to identify what the client wants, estimate time using basic mechanical repair knowledge, apply $80/hr rate (1 hour minimum, $20 per 15 min extra), and reply with a friendly, useful message.\n\nFormat like this:\n---\nReply: [The message to text back]\nIntent: [e.g. Quote Request, Booking, Emergency]\nAction: [e.g. Send booking link, Ask for more info, Mark for review]\n---`
        }
      ]

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-4o-mini', // Use cheaper model to reduce costs
          temperature: 0.6,
          max_tokens: 500, // Limit response length to save costs
          messages
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      )

      const fullResponse = response.data?.choices?.[0]?.message?.content || ''
      
      return this.parseAIResponse(fullResponse)
    } catch (error: any) {
      console.error('OpenAI API Error:', error.response?.status, error.response?.data)
      
      // Handle specific error cases and provide fallback responses
      if (error.response?.status === 429) {
        console.log('⚠️  Rate limit/No credits - using intelligent fallback')
        return this.getIntelligentFallback(messageBody)
      }
      
      if (error.response?.status === 401) {
        console.log('⚠️  Invalid API key - using fallback response')
        return this.getIntelligentFallback(messageBody)
      }
      
      if (error.response?.status >= 400) {
        console.log('⚠️  API error - using fallback response')
        return this.getIntelligentFallback(messageBody)
      }
      
      // Network or other errors
      console.log('⚠️  Network/timeout error - using fallback response')
      return this.getIntelligentFallback(messageBody)
    }
  }

  private getIntelligentFallback(messageBody: string): AIResponse {
    // Intelligent fallback logic when AI is unavailable
    const lowerMessage = messageBody.toLowerCase()
    
    // Emergency detection
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

  private parseAIResponse(fullResponse: string): AIResponse {
    const lines = fullResponse.split('\n')
    
    // Extract Reply line
    const replyLine = lines.find(line => line.toLowerCase().startsWith('reply:'))
    const reply = replyLine ? replyLine.replace(/^reply:\s*/i, '').trim() : fullResponse
    
    // Extract Intent line
    const intentLine = lines.find(line => line.toLowerCase().startsWith('intent:'))
    const intent = intentLine ? intentLine.replace(/^intent:\s*/i, '').trim() : 'General Inquiry'
    
    // Extract Action line
    const actionLine = lines.find(line => line.toLowerCase().startsWith('action:'))
    const action = actionLine ? actionLine.replace(/^action:\s*/i, '').trim() : 'Reply sent'

    return { reply, intent, action }
  }
}