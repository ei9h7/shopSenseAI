import axios from 'axios'

const OPENPHONE_API_URL = 'https://api.openphone.com/v1'

export class OpenPhoneService {
  private apiKey: string
  private phoneNumber: string

  constructor(apiKey: string, phoneNumber: string) {
    this.apiKey = apiKey
    this.phoneNumber = phoneNumber
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      console.log(`📤 Attempting to send SMS via OpenPhone API`)
      console.log(`   From: ${this.phoneNumber}`)
      console.log(`   To: ${to}`)
      console.log(`   Message: ${message.substring(0, 50)}...`)
      
      const response = await axios.post(
        `${OPENPHONE_API_URL}/messages`,
        {
          content: message,  // OpenPhone uses 'content' not 'text'
          from: this.phoneNumber,
          to: [to]
        },
        {
          headers: {
            'Authorization': this.apiKey,  // No 'Bearer' prefix
            'Content-Type': 'application/json'
          }
        }
      )

      console.log(`✅ OpenPhone API Response: ${response.status} ${response.statusText}`)
      return response.status === 200 || response.status === 201
    } catch (error: any) {
      console.error('❌ OpenPhone SMS Error Details:')
      console.error(`   Status: ${error.response?.status}`)
      console.error(`   Status Text: ${error.response?.statusText}`)
      console.error(`   Error Data:`, error.response?.data)
      console.error(`   API Key (first 8 chars): ${this.apiKey.substring(0, 8)}...`)
      console.error(`   Phone Number: ${this.phoneNumber}`)
      
      if (error.response?.status === 401) {
        throw new Error(`OpenPhone API Authentication Failed (401): ${error.response?.data?.message || 'Unauthorized - Check API key format'}`)
      } else if (error.response?.status === 403) {
        throw new Error(`OpenPhone API Forbidden (403): ${error.response?.data?.message || 'Forbidden'}`)
      } else if (error.response?.status === 400) {
        throw new Error(`OpenPhone API Bad Request (400): ${error.response?.data?.message || 'Bad Request'}`)
      } else {
        throw new Error(`OpenPhone API Error (${error.response?.status || 'Unknown'}): ${error.response?.data?.message || error.message}`)
      }
    }
  }

  async getMessages(limit: number = 50): Promise<any[]> {
    try {
      const response = await axios.get(
        `${OPENPHONE_API_URL}/messages?limit=${limit}`,
        {
          headers: {
            'Authorization': this.apiKey  // No 'Bearer' prefix
          }
        }
      )

      return response.data?.data || []
    } catch (error) {
      console.error('OpenPhone Get Messages Error:', error)
      throw new Error('Failed to fetch messages')
    }
  }
}