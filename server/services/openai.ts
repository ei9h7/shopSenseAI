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
          model: 'gpt-4o-mini', // Use cheaper model to avoid rate limits
          temperature: 0.6,
          max_tokens: 500, // Limit response length
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
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        console.log('⚠️  Rate limit hit, using fallback response')
        return this.getFallbackResponse(messageBody)
      }
      
      // Handle other API errors
      if (error.response?.status >= 400) {
        console.log('⚠️  API error, using fallback response')
        return this.getFallbackResponse(messageBody)
      }
      
      throw new Error('Failed to process message with AI')
    }
  }

  private getFallbackResponse(messageBody: string): AIResponse {
    // Simple fallback logic when AI is unavailable
    const lowerMessage = messageBody.toLowerCase()
    
    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('breakdown')) {
      return {
        reply: "Thanks for reaching out! This sounds urgent. I'll get back to you as soon as possible. If this is an emergency, please call me directly.",
        intent: "Emergency",
        action: "Priority response needed"
      }
    }
    
    if (lowerMessage.includes('oil change') || lowerMessage.includes('service') || lowerMessage.includes('maintenance')) {
      return {
        reply: "Hi! Thanks for your message about service. I'd be happy to help with your vehicle maintenance. My rate is $80/hr with a 1-hour minimum. Can you tell me more about what you need?",
        intent: "Service Request",
        action: "Quote requested"
      }
    }
    
    if (lowerMessage.includes('quote') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return {
        reply: "Thanks for reaching out! I'd be happy to provide a quote. My labor rate is $80/hr with a 1-hour minimum. Can you provide more details about the work needed?",
        intent: "Quote Request",
        action: "More info needed"
      }
    }
    
    // Default response
    return {
      reply: "Hi! Thanks for your message. I'm Pink Chicken Speed Shop and I'd be happy to help with your automotive needs. My rate is $80/hr. What can I help you with today?",
      intent: "General Inquiry",
      action: "Initial contact"
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