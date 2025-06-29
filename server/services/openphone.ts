import axios from 'axios'

const OPENPHONE_API_URL = 'https://api.openphone.com/v1'

/**
 * OpenPhoneService Class
 * 
 * A service class that handles SMS communication via the OpenPhone API.
 * This service provides reliable SMS sending and receiving capabilities with:
 * 
 * - Multiple authentication methods for maximum compatibility
 * - Comprehensive error handling and debugging
 * - Detailed logging for troubleshooting
 * - Automatic retry logic for different auth formats
 * - Production-ready error reporting
 * 
 * The service is designed to work with OpenPhone's webhook system for
 * receiving incoming messages and their REST API for sending responses.
 * It includes robust error handling to diagnose common issues like
 * authentication failures, rate limits, and network problems.
 */
export class OpenPhoneService {
  private apiKey: string
  private phoneNumber: string

  constructor(apiKey: string, phoneNumber: string) {
    this.apiKey = apiKey
    this.phoneNumber = phoneNumber
  }

  /**
   * Sends an SMS message via OpenPhone API
   * 
   * This method attempts multiple authentication formats to ensure compatibility
   * with different OpenPhone API configurations. It provides detailed logging
   * and error handling to help diagnose issues in production.
   * 
   * @param to - The recipient's phone number
   * @param message - The SMS message content to send
   * @returns Promise<boolean> - True if message was sent successfully
   */
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
      
      // Try each authentication method until one works
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
      
      // Provide specific error messages for common issues
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

  /**
   * Retrieves messages from OpenPhone API
   * 
   * This method fetches recent messages from the OpenPhone API.
   * Currently used for debugging and potential future features.
   * 
   * @param limit - Maximum number of messages to retrieve (default: 50)
   * @returns Promise<any[]> - Array of message objects from OpenPhone
   */
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