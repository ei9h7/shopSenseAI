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

            // Use the correct OpenPhone API format
            const response = await axios.post(`${OPENPHONE_API_URL}/messages`, {
                content: message,
                from: this.phoneNumber,
                to: [to]
            }, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log(`✅ OpenPhone API Response: ${response.status} ${response.statusText}`);
            return response.status === 200 || response.status === 201 || response.status === 202;
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
     * Gets messages from OpenPhone API with corrected parameters
     * Based on OpenPhone API v1 documentation
     */
    async getMessages(phoneNumber = null, limit = 50) {
        try {
            console.log(`📞 Fetching messages from OpenPhone API...`);
            console.log(`   Phone filter: ${phoneNumber || 'All conversations'}`);
            console.log(`   Limit: ${limit}`);
            
            // Build the correct API URL with query parameters
            const url = new URL(`${OPENPHONE_API_URL}/messages`);
            
            // Add limit parameter
            url.searchParams.append('limit', limit.toString());
            
            // If we have a specific phone number, we'll filter client-side
            // as OpenPhone API doesn't support direct phone number filtering in the messages endpoint
            
            console.log(`📡 Requesting: ${url.toString()}`);
            
            const response = await axios.get(url.toString(), {
                headers: {
                    'Authorization': this.apiKey,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });
            
            console.log(`✅ OpenPhone Messages API Response: ${response.status}`);
            console.log(`📊 Response data structure:`, Object.keys(response.data || {}));
            
            let messages = [];
            
            // Handle OpenPhone API response format
            if (response.data?.data && Array.isArray(response.data.data)) {
                messages = response.data.data;
            } else if (Array.isArray(response.data)) {
                messages = response.data;
            } else {
                console.warn('⚠️ Unexpected response format from OpenPhone API');
                console.log('📄 Full response:', response.data);
                messages = [];
            }
            
            console.log(`📨 Retrieved ${messages.length} total messages from OpenPhone`);
            
            // If we have a specific phone number, filter messages client-side
            if (phoneNumber && messages.length > 0) {
                const filteredMessages = messages.filter(msg => {
                    // Check both 'from' and 'to' fields to capture the full conversation
                    const msgFrom = msg.from || '';
                    const msgTo = msg.to || '';
                    return msgFrom === phoneNumber || msgTo === phoneNumber;
                });
                
                console.log(`🎯 Filtered to ${filteredMessages.length} messages for ${phoneNumber}`);
                return filteredMessages;
            }
            
            return messages;
            
        } catch (error) {
            console.error('❌ OpenPhone Get Messages Error:', error.response?.status, error.response?.data);
            
            // Log detailed error information for debugging
            if (error.response?.data?.errors) {
                console.error('❌ Detailed API errors:', error.response.data.errors);
            }
            
            console.error('❌ Full error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            // Return empty array as fallback instead of throwing
            console.log('🔄 Returning empty message history due to API error');
            return [];
        }
    }
    
    /**
     * Gets conversation history for a specific phone number
     * Uses the corrected API format and better error handling
     */
    async getConversationHistory(phoneNumber, limit = 20) {
        try {
            console.log(`💬 Getting conversation history for ${phoneNumber}`);
            
            // Get all recent messages and filter for this conversation
            const allMessages = await this.getMessages(null, 100);
            
            if (allMessages.length === 0) {
                console.log('📭 No messages retrieved from OpenPhone API');
                return [];
            }
            
            // Filter and format messages for this specific conversation
            const conversationMessages = allMessages
                .filter(msg => {
                    const msgFrom = msg.from || '';
                    const msgTo = msg.to || '';
                    return msgFrom === phoneNumber || msgTo === phoneNumber;
                })
                .map(msg => ({
                    id: msg.id || Date.now().toString(),
                    phone_number: phoneNumber,
                    body: msg.body || msg.content || msg.text || '',
                    direction: (msg.from === phoneNumber) ? 'inbound' : 'outbound',
                    timestamp: msg.createdAt || msg.created_at || new Date().toISOString(),
                    processed: true,
                    created_at: msg.createdAt || msg.created_at || new Date().toISOString()
                }))
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .slice(-limit); // Get the most recent messages
            
            console.log(`📚 Formatted ${conversationMessages.length} conversation messages`);
            
            // Log conversation for debugging
            if (conversationMessages.length > 0) {
                console.log('💬 Conversation preview:');
                conversationMessages.slice(-3).forEach((msg, index) => {
                    console.log(`   ${msg.direction.toUpperCase()}: "${msg.body.substring(0, 50)}..."`);
                });
            }
            
            return conversationMessages;
            
        } catch (error) {
            console.error('❌ Error getting conversation history:', error);
            return [];
        }
    }
}