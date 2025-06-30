import axios from 'axios';
const OPENPHONE_API_URL = 'https://api.openphone.com/v1';

export class OpenPhoneService {
    apiKey;
    phoneNumber;

    constructor(apiKey, phoneNumber) {
        this.apiKey = apiKey;
        this.phoneNumber = phoneNumber;
    }

    async sendSMS(to, message) {
        try {
            console.log(`📤 Attempting to send SMS via OpenPhone API`);
            console.log(`   From: ${this.phoneNumber}`);
            console.log(`   To: ${to}`);
            console.log(`   Message: ${message.substring(0, 50)}...`);

            // Try different authentication formats based on OpenPhone docs
            const authHeaders = [
                { 'Authorization': this.apiKey }, // Direct API key
                { 'Authorization': `Bearer ${this.apiKey}` }, // Bearer format
                { 'X-API-Key': this.apiKey }, // X-API-Key format
                { 'openphone-api-key': this.apiKey } // Custom header format
            ];

            let lastError = null;
            for (let i = 0; i < authHeaders.length; i++) {
                try {
                    console.log(`🔄 Trying authentication method ${i + 1}/4...`);
                    const response = await axios.post(`${OPENPHONE_API_URL}/messages`, {
                        content: message,
                        from: this.phoneNumber,
                        to: [to]
                    }, {
                        headers: {
                            ...authHeaders[i],
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    console.log(`✅ OpenPhone API Response: ${response.status} ${response.statusText}`);
                    console.log(`✅ Authentication method ${i + 1} worked!`);
                    return response.status === 200 || response.status === 201;
                }
                catch (authError) {
                    lastError = authError;
                    console.log(`❌ Authentication method ${i + 1} failed: ${authError.response?.status}`);
                    if (authError.response?.status !== 401 && authError.response?.status !== 403) {
                        // If it's not an auth error, don't try other methods
                        break;
                    }
                }
            }

            // If all auth methods failed, throw the last error
            throw lastError;
        }
        catch (error) {
            console.error('❌ OpenPhone SMS Error Details:');
            console.error(`   Status: ${error.response?.status}`);
            console.error(`   Status Text: ${error.response?.statusText}`);
            console.error(`   Error Data:`, error.response?.data);
            console.error(`   API Key (first 8 chars): ${this.apiKey.substring(0, 8)}...`);
            console.error(`   Phone Number: ${this.phoneNumber}`);

            if (error.response?.status === 401) {
                throw new Error(`OpenPhone API Authentication Failed (401): ${error.response?.data?.message || 'Unauthorized - Check API key format and permissions'}`);
            }
            else if (error.response?.status === 403) {
                throw new Error(`OpenPhone API Forbidden (403): ${error.response?.data?.message || 'Forbidden - Check API key permissions'}`);
            }
            else if (error.response?.status === 400) {
                throw new Error(`OpenPhone API Bad Request (400): ${error.response?.data?.message || 'Bad Request - Check request format'}`);
            }
            else {
                throw new Error(`OpenPhone API Error (${error.response?.status || 'Unknown'}): ${error.response?.data?.message || error.message}`);
            }
        }
    }
    
    /**
     * Gets messages from OpenPhone API with proper conversation filtering
     * This fetches messages and filters by conversation/phone number
     */
    async getMessages(phoneNumber = null, limit = 50) {
        try {
            console.log(`📞 Fetching messages from OpenPhone API...`);
            console.log(`   Phone filter: ${phoneNumber || 'All conversations'}`);
            console.log(`   Limit: ${limit}`);
            
            // Try different authentication formats
            const authHeaders = [
                { 'Authorization': this.apiKey },
                { 'Authorization': `Bearer ${this.apiKey}` },
                { 'X-API-Key': this.apiKey },
                { 'openphone-api-key': this.apiKey }
            ];
            
            let lastError = null;
            for (let i = 0; i < authHeaders.length; i++) {
                try {
                    console.log(`🔄 Trying authentication method ${i + 1}/4 for message retrieval...`);
                    
                    // Build query parameters
                    const params = new URLSearchParams();
                    params.append('limit', limit.toString());
                    
                    // If we have a specific phone number, try to filter by it
                    if (phoneNumber) {
                        // Try different parameter names that OpenPhone might use
                        params.append('phoneNumber', phoneNumber);
                    }
                    
                    const url = `${OPENPHONE_API_URL}/messages?${params.toString()}`;
                    console.log(`📡 Requesting: ${url}`);
                    
                    const response = await axios.get(url, {
                        headers: {
                            ...authHeaders[i],
                            'Accept': 'application/json'
                        },
                        timeout: 15000
                    });
                    
                    console.log(`✅ OpenPhone Messages API Response: ${response.status}`);
                    console.log(`📊 Raw response data structure:`, Object.keys(response.data || {}));
                    
                    let messages = [];
                    
                    // Handle different response formats
                    if (response.data?.data) {
                        messages = response.data.data;
                    } else if (response.data?.messages) {
                        messages = response.data.messages;
                    } else if (Array.isArray(response.data)) {
                        messages = response.data;
                    } else {
                        console.warn('⚠️ Unexpected response format from OpenPhone API');
                        messages = [];
                    }
                    
                    console.log(`📨 Retrieved ${messages.length} total messages from OpenPhone`);
                    
                    // If we have a specific phone number, filter messages client-side
                    if (phoneNumber && messages.length > 0) {
                        const filteredMessages = messages.filter(msg => {
                            const msgFrom = msg.from || msg.fromNumber || '';
                            const msgTo = msg.to || msg.toNumber || '';
                            return msgFrom === phoneNumber || msgTo === phoneNumber;
                        });
                        
                        console.log(`🎯 Filtered to ${filteredMessages.length} messages for ${phoneNumber}`);
                        return filteredMessages;
                    }
                    
                    return messages;
                    
                } catch (authError) {
                    lastError = authError;
                    console.log(`❌ Authentication method ${i + 1} failed: ${authError.response?.status}`);
                    console.log(`❌ Error details:`, authError.response?.data);
                    
                    if (authError.response?.status !== 401 && authError.response?.status !== 403) {
                        break;
                    }
                }
            }
            
            throw lastError;
            
        } catch (error) {
            console.error('❌ OpenPhone Get Messages Error:', error.response?.status, error.response?.data);
            console.error('❌ Full error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            // Don't throw error - return empty array as fallback
            console.log('🔄 Returning empty message history due to API error');
            return [];
        }
    }
    
    /**
     * Gets conversation history for a specific phone number
     * This is a more targeted approach to get conversation context
     */
    async getConversationHistory(phoneNumber, limit = 20) {
        try {
            console.log(`💬 Getting conversation history for ${phoneNumber}`);
            
            // Get all recent messages and filter for this conversation
            const allMessages = await this.getMessages(null, 100); // Get more messages to ensure we capture the conversation
            
            // Filter and format messages for this specific conversation
            const conversationMessages = allMessages
                .filter(msg => {
                    const msgFrom = msg.from || msg.fromNumber || '';
                    const msgTo = msg.to || msg.toNumber || '';
                    return msgFrom === phoneNumber || msgTo === phoneNumber;
                })
                .map(msg => ({
                    id: msg.id,
                    phone_number: phoneNumber,
                    body: msg.body || msg.content || msg.text || '',
                    direction: (msg.from === phoneNumber || msg.fromNumber === phoneNumber) ? 'inbound' : 'outbound',
                    timestamp: msg.createdAt || msg.created_at || new Date().toISOString(),
                    processed: true,
                    created_at: msg.createdAt || msg.created_at || new Date().toISOString()
                }))
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .slice(-limit); // Get the most recent messages
            
            console.log(`📚 Formatted ${conversationMessages.length} conversation messages`);
            return conversationMessages;
            
        } catch (error) {
            console.error('❌ Error getting conversation history:', error);
            return [];
        }
    }
}