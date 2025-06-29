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
          model: 'gpt-4o',
          temperature: 0.6,
          messages
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const fullResponse = response.data?.choices?.[0]?.message?.content || ''
      
      return this.parseAIResponse(fullResponse)
    } catch (error) {
      console.error('OpenAI API Error:', error)
      throw new Error('Failed to process message with AI')
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