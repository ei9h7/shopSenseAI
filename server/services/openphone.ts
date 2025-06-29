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
      
      // Try different authentication formats based on OpenPhone docs
      const authHeaders = [
        { 'Authorization': this.apiKey },                    // Direct API key
        { 'Authorization': `Bearer ${this.apiKey}` },        // Bearer format
        { 'X-API-Key': this.apiKey },                       // X-API-Key format
        { 'openphone-api-key': this.apiKey }                // Custom header format
      ]
      
      let lastError: any = null
      
      for (let i = 0; i < authHeaders.length; i++) {
        try {
          console.log(`🔄 Trying authentication method ${i + 1}/4...`)
          
          const response = await axios.post(
            `${OPENPHONE_API_URL}/messages`,
            {
              content: message,
              from: this.phoneNumber,
              to: [to]
            },
            {
              headers: {
                ...authHeaders[i],
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          )

          console.log(`✅ OpenPhone API Response: ${response.status} ${response.statusText}`)
          console.log(`✅ Authentication method ${i + 1} worked!`)
          return response.status === 200 || response.status === 201
          
        } catch (authError: any) {
          lastError = authError
          console.log(`❌ Authentication method ${i + 1} failed: ${authError.response?.status}`)
          
          if (authError.response?.status !== 401 && authError.response?.status !== 403) {
            // If it's not an auth error, don't try other methods
            break
          }
        }
      }
      
      // If all auth methods failed, throw the last error
      throw lastError
      
    } catch (error: any) {
      console.error('❌ OpenPhone SMS Error Details:')
      console.error(`   Status: ${error.response?.status}`)
      console.error(`   Status Text: ${error.response?.statusText}`)
      console.error(`   Error Data:`, error.response?.data)
      console.error(`   API Key (first 8 chars): ${this.apiKey.substring(0, 8)}...`)
      console.error(`   Phone Number: ${this.phoneNumber}`)
      
      if (error.response?.status === 401) {
        throw new Error(`OpenPhone API Authentication Failed (401): ${error.response?.data?.message || 'Unauthorized - Check API key format and permissions'}`)
      } else if (error.response?.status === 403) {
        throw new Error(`OpenPhone API Forbidden (403): ${error.response?.data?.message || 'Forbidden - Check API key permissions'}`)
      } else if (error.response?.status === 400) {
        throw new Error(`OpenPhone API Bad Request (400): ${error.response?.data?.message || 'Bad Request - Check request format'}`)
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
            'Authorization': this.apiKey
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