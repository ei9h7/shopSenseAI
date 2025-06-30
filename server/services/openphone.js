import axios from 'axios';
const OPENPHONE_API_URL = 'https://api.openphone.com/v1';

export class OpenPhoneService {
    apiKey;
    phoneNumber;
    phoneNumberId; // Store the phoneNumberId from webhook

    constructor(apiKey, phoneNumber, phoneNumberId = null) {
        this.apiKey = apiKey;
        this.phoneNumber = phoneNumber;
        this.phoneNumberId = phoneNumberId;
    }

    /**
     * Updates the phoneNumberId when we receive it from webhook data
     */
    setPhoneNumberId(phoneNumberId) {
        this.phoneNumberId = phoneNumberId;
        console.log(`📱 Updated phoneNumberId: ${phoneNumberId}`);
    }

    async sendSMS(to, message) {
        try {
            console.log(`📤 Attempting to send SMS via OpenPhone API`);
            console.log(`   From: ${this.phoneNumber}`);
            console.log(`   To: ${to}`);
            console.log(`   Message: ${message.substring(0, 50)}...`);

            // Use the correct OpenPhone API format for sending messages
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
     * Gets messages using the correct OpenPhone API format with required parameters
     * Fixed: Properly handle participants as an array parameter, not JSON string
     */
    async getMessages(phoneNumber = null, limit = 50) {
        try {
            console.log(`📞 Fetching messages from OpenPhone API...`);
            console.log(`   Phone filter: ${phoneNumber || 'All conversations'}`);
            console.log(`   Limit: ${limit}`);
            console.log(`   PhoneNumberId: ${this.phoneNumberId || 'Not available'}`);
            
            // Build request parameters - CRITICAL FIX: Use proper array handling
            const requestParams = {
                limit: Math.min(limit, 100)
            };
            
            // According to the error, we need BOTH phoneNumberId AND participants
            if (this.phoneNumberId) {
                // Add phoneNumberId
                requestParams.phoneNumberId = this.phoneNumberId;
                console.log(`🎯 Using phoneNumberId: ${this.phoneNumberId}`);
                
                // CRITICAL FIX: Add participants as actual array, not JSON string
                if (phoneNumber) {
                    // Participants array with the specific customer
                    requestParams.participants = [phoneNumber];
                    console.log(`🎯 Using participants array: [${phoneNumber}]`);
                } else {
                    // Participants array with our phone number to get all conversations for this phoneNumberId
                    requestParams.participants = [this.phoneNumber];
                    console.log(`🎯 Using participants array: [${this.phoneNumber}]`);
                }
            } else {
                // Fallback: Use participants only (when we don't have phoneNumberId)
                if (phoneNumber) {
                    requestParams.participants = [phoneNumber, this.phoneNumber];
                    console.log(`🎯 Fallback - Using participants array: [${phoneNumber}, ${this.phoneNumber}]`);
                } else {
                    requestParams.participants = [this.phoneNumber];
                    console.log(`🎯 Fallback - Using participants array: [${this.phoneNumber}]`);
                }
            }
            
            console.log(`📋 Request parameters:`, requestParams);
            
            // Use axios params option to properly encode array parameters
            const response = await axios.get(`${OPENPHONE_API_URL}/messages`, {
                params: requestParams,
                headers: {
                    'Authorization': this.apiKey,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 15000,
                // CRITICAL: Configure axios to properly handle array parameters
                paramsSerializer: {
                    indexes: null // This ensures arrays are serialized as participants[]=value1&participants[]=value2
                }
            });
            
            console.log(`✅ OpenPhone Messages API Response: ${response.status}`);
            console.log(`📊 Response structure:`, {
                hasData: !!response.data,
                dataKeys: Object.keys(response.data || {}),
                dataType: Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data
            });
            
            let messages = [];
            
            // Handle OpenPhone API response format according to docs
            // The response should be: { data: [...messages], meta: {...} }
            if (response.data?.data && Array.isArray(response.data.data)) {
                messages = response.data.data;
                console.log(`📨 Retrieved ${messages.length} messages from OpenPhone API`);
                
                // Log sample message structure for debugging
                if (messages.length > 0) {
                    console.log(`📄 Sample message structure:`, {
                        id: messages[0].id,
                        from: messages[0].from,
                        to: messages[0].to,
                        direction: messages[0].direction,
                        body: messages[0].body?.substring(0, 30) + '...',
                        createdAt: messages[0].createdAt,
                        availableFields: Object.keys(messages[0])
                    });
                }
            } else {
                console.warn('⚠️ Unexpected response format from OpenPhone API');
                console.log('📄 Full response data:', response.data);
                
                // Try alternative response formats
                if (Array.isArray(response.data)) {
                    messages = response.data;
                    console.log(`📨 Retrieved ${messages.length} messages (direct array format)`);
                } else {
                    console.error('❌ Could not parse messages from OpenPhone response');
                    return [];
                }
            }
            
            // If we have a specific phone number, filter messages client-side as backup
            if (phoneNumber && messages.length > 0) {
                const filteredMessages = messages.filter(msg => {
                    // Normalize phone numbers for comparison (remove +, spaces, etc.)
                    const normalizePhone = (phone) => phone?.replace(/[\s\-\(\)\+]/g, '') || '';
                    const targetPhone = normalizePhone(phoneNumber);
                    const msgFrom = normalizePhone(msg.from);
                    const msgTo = normalizePhone(msg.to);
                    
                    return msgFrom === targetPhone || msgTo === targetPhone;
                });
                
                console.log(`🎯 Filtered to ${filteredMessages.length} messages for ${phoneNumber}`);
                return filteredMessages;
            }
            
            return messages;
            
        } catch (error) {
            console.error('❌ OpenPhone Get Messages Error:', error.response?.status);
            
            // Enhanced error logging for debugging
            if (error.response) {
                console.error('❌ Response Status:', error.response.status);
                console.error('❌ Response Headers:', error.response.headers);
                console.error('❌ Response Data:', error.response.data);
                
                // Log specific error details if available
                if (error.response.data?.errors) {
                    console.error('❌ API Error Details:');
                    error.response.data.errors.forEach((err, index) => {
                        console.error(`   Error ${index + 1}:`, err);
                    });
                }
                
                // Check for specific error codes mentioned in OpenPhone docs
                if (error.response.status === 400) {
                    console.error('❌ Bad Request - Parameter issues:');
                    console.error('   - Both phoneNumberId AND participants are required');
                    console.error('   - phoneNumberId format should be: PN...');
                    console.error('   - participants should be array of phone numbers (not JSON string)');
                    console.error(`   - Current phoneNumberId: ${this.phoneNumberId || 'Not set'}`);
                    console.error(`   - Current participants: ${phoneNumber ? `[${phoneNumber}]` : `[${this.phoneNumber}]`}`);
                    console.error('   - FIXED: Now using proper array serialization instead of JSON.stringify');
                }
                
                if (error.response.status === 401) {
                    console.error('❌ Unauthorized - Check API key');
                    console.error(`   - API Key preview: ${this.apiKey.substring(0, 8)}...`);
                }
                
                if (error.response.status === 403) {
                    console.error('❌ Forbidden - Check API key permissions');
                }
                
                if (error.response.status === 429) {
                    console.error('❌ Rate Limited - Too many requests');
                }
            } else if (error.request) {
                console.error('❌ Network Error - No response received');
                console.error('   Request details:', error.request);
            } else {
                console.error('❌ Request Setup Error:', error.message);
            }
            
            // Return empty array as fallback instead of throwing
            console.log('🔄 Returning empty message history due to API error');
            return [];
        }
    }
    
    /**
     * Gets conversation history for a specific phone number
     * Uses the corrected API format with proper array parameter handling
     */
    async getConversationHistory(phoneNumber, limit = 20) {
        try {
            console.log(`💬 Getting conversation history for ${phoneNumber}`);
            
            // Get messages using the corrected API call
            const allMessages = await this.getMessages(phoneNumber, Math.min(limit * 2, 100));
            
            if (allMessages.length === 0) {
                console.log('📭 No messages retrieved from OpenPhone API');
                return [];
            }
            
            // Filter and format messages for this specific conversation
            const conversationMessages = allMessages
                .filter(msg => {
                    // Normalize phone numbers for comparison
                    const normalizePhone = (phone) => phone?.replace(/[\s\-\(\)\+]/g, '') || '';
                    const targetPhone = normalizePhone(phoneNumber);
                    const msgFrom = normalizePhone(msg.from);
                    const msgTo = normalizePhone(msg.to);
                    
                    return msgFrom === targetPhone || msgTo === targetPhone;
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