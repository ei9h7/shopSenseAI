import { OpenAIService } from './openai.js';
import { OpenPhoneService } from './openphone.js';

// Simple in-memory storage for messages (in production, use a database)
let messageStore = []

export class MessageProcessor {
    openAI = null;
    openPhone = null;
    settings = null;

    async initialize() {
        try {
            // Server environment - use environment variables
            this.settings = {
                business_name: process.env.BUSINESS_NAME || 'Pink Chicken Speed Shop',
                labor_rate: parseInt(process.env.LABOR_RATE || '80'),
                openai_api_key: process.env.OPENAI_API_KEY || '',
                openphone_api_key: process.env.OPENPHONE_API_KEY || '',
                phone_number: process.env.OPENPHONE_PHONE_NUMBER || '',
                dnd_enabled: process.env.DND_ENABLED === 'true'
            };

            // Initialize services if API keys are available
            if (this.settings.openai_api_key) {
                this.openAI = new OpenAIService(this.settings.openai_api_key);
                console.log('✅ OpenAI service initialized');
            }
            else {
                console.warn('⚠️  OpenAI API key not found');
            }

            if (this.settings.openphone_api_key && this.settings.phone_number) {
                this.openPhone = new OpenPhoneService(this.settings.openphone_api_key, this.settings.phone_number);
                console.log('✅ OpenPhone service initialized');
                console.log(`📱 Using OpenPhone number: ${this.settings.phone_number}`);
                console.log(`🔑 OpenPhone API key: ${this.settings.openphone_api_key.substring(0, 8)}...`);
            }
            else {
                console.warn('⚠️  OpenPhone API key or phone number not found');
            }

            console.log('🤖 MessageProcessor initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize MessageProcessor:', error);
        }
    }

    /**
     * Gets conversation history from OpenPhone API
     * This ensures we always have the complete, authoritative conversation history
     */
    async getConversationHistoryFromOpenPhone(phoneNumber) {
        if (!this.openPhone) {
            console.warn('⚠️ OpenPhone service not available');
            return [];
        }

        try {
            console.log(`📞 Fetching conversation history from OpenPhone for ${phoneNumber}`);
            
            // Get recent messages from OpenPhone
            const messages = await this.openPhone.getMessages(50); // Get last 50 messages
            
            // Filter messages for this specific phone number and format for AI context
            const conversationMessages = messages
                .filter(msg => msg.from === phoneNumber || msg.to === phoneNumber)
                .map(msg => ({
                    id: msg.id,
                    phone_number: msg.from === phoneNumber ? msg.from : msg.to,
                    body: msg.body || msg.text || '',
                    direction: msg.from === phoneNumber ? 'inbound' : 'outbound',
                    timestamp: msg.createdAt || msg.created_at,
                    processed: true,
                    created_at: msg.createdAt || msg.created_at
                }))
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .slice(-10); // Last 10 messages for context

            console.log(`📚 Retrieved ${conversationMessages.length} messages from OpenPhone for context`);
            return conversationMessages;
        } catch (error) {
            console.error('❌ Error fetching conversation history from OpenPhone:', error);
            console.log('🔄 OpenPhone API unavailable - no conversation context');
            return [];
        }
    }

    async processIncomingMessage(phoneNumber, messageBody) {
        try {
            console.log(`📨 Processing message from ${phoneNumber}: ${messageBody}`);

            // Create new message object for local tracking
            const message = {
                id: Date.now().toString(),
                phone_number: phoneNumber,
                body: messageBody,
                direction: 'inbound',
                timestamp: new Date().toISOString(),
                processed: false,
                created_at: new Date().toISOString(),
                read: false
            };

            // Store message in memory for immediate webhook response
            messageStore.unshift(message);
            console.log('📝 Message stored locally for webhook response');
            console.log(`📊 Total messages in local store: ${messageStore.length}`);

            // Check if Do Not Disturb is enabled
            const isDndEnabled = await this.isDndEnabled();
            console.log(`🔕 DND Status: ${isDndEnabled ? 'Enabled' : 'Disabled'}`);

            if (!isDndEnabled) {
                // Just store the message, don't auto-respond
                console.log('✅ Message received (no auto-response - DND disabled)');
                return;
            }

            // Only proceed with AI response if both services are available
            if (this.openAI && this.openPhone) {
                // Get conversation history from OpenPhone for complete context
                const conversationHistory = await this.getConversationHistoryFromOpenPhone(phoneNumber);
                console.log(`💬 Using ${conversationHistory.length} messages for AI context`);

                let aiResponse;

                try {
                    console.log('🤖 Attempting AI processing with OpenPhone conversation context...');
                    aiResponse = await this.openAI.processMessageWithContext(
                        messageBody, 
                        conversationHistory,
                        this.settings.business_name
                    );
                    console.log('🎯 AI Response successful:', aiResponse);
                }
                catch (aiError) {
                    console.error('❌ AI processing failed, using emergency fallback:', aiError);
                    // Emergency fallback when AI completely fails
                    aiResponse = this.getEmergencyFallback(messageBody, conversationHistory);
                }

                // Update the stored message with AI response data
                const messageIndex = messageStore.findIndex(m => m.id === message.id);
                if (messageIndex !== -1) {
                    messageStore[messageIndex] = {
                        ...messageStore[messageIndex],
                        ai_response: aiResponse.reply,
                        intent: aiResponse.intent,
                        action: aiResponse.action,
                        processed: true
                    };
                }

                // Send response via SMS
                try {
                    await this.sendResponse(phoneNumber, aiResponse, message.id);

                    // Create outbound message record for local tracking
                    const outboundMessage = {
                        id: Date.now().toString() + '_out',
                        phone_number: phoneNumber,
                        body: aiResponse.reply,
                        direction: 'outbound',
                        timestamp: new Date().toISOString(),
                        processed: true,
                        created_at: new Date().toISOString(),
                        read: true
                    };

                    messageStore.unshift(outboundMessage);
                    console.log('📤 Outbound message stored locally');

                    // Log action needed for manual follow-up
                    if (aiResponse.action.includes('URGENT') || aiResponse.intent === 'Emergency') {
                        console.log('🚨🚨🚨 URGENT ACTION REQUIRED 🚨🚨🚨');
                        console.log(`📞 CALL ${phoneNumber} IMMEDIATELY`);
                        console.log(`💬 Message: "${messageBody}"`);
                        console.log('🚨🚨🚨 URGENT ACTION REQUIRED 🚨🚨🚨');
                    }
                }
                catch (smsError) {
                    console.error('❌ Failed to send SMS response:', smsError);
                    console.log('📝 MESSAGE PROCESSING SUMMARY:');
                    console.log(`📱 From: ${phoneNumber}`);
                    console.log(`💬 Message: "${messageBody}"`);
                    console.log(`🤖 AI Response: "${aiResponse.reply}"`);
                    console.log(`🎯 Intent: ${aiResponse.intent}`);
                    console.log(`📋 Action: ${aiResponse.action}`);
                    console.log('❌ SMS SENDING FAILED - MANUAL RESPONSE REQUIRED');

                    if (aiResponse.intent === 'Emergency' || aiResponse.action.includes('URGENT')) {
                        console.log('🚨🚨🚨 EMERGENCY - IMMEDIATE MANUAL RESPONSE REQUIRED 🚨🚨🚨');
                    }
                }
            }
            else {
                console.error('❌ AI or OpenPhone service not available - cannot send response');
                console.log('📝 MESSAGE RECEIVED BUT NO RESPONSE CAPABILITY:');
                console.log(`📱 From: ${phoneNumber}`);
                console.log(`💬 Message: "${messageBody}"`);
                console.log('⚠️  MANUAL RESPONSE REQUIRED');
            }
        }
        catch (error) {
            console.error('❌ Error processing message:', error);

            // Log the message details for manual follow-up
            console.log('📝 MESSAGE PROCESSING FAILED:');
            console.log(`📱 From: ${phoneNumber}`);
            console.log(`💬 Message: "${messageBody}"`);
            console.log('⚠️  MANUAL RESPONSE REQUIRED');

            // Don't throw the error - we want the webhook to return 200 to OpenPhone
        }
    }

    // Method to get all messages (for API endpoint)
    getMessages() {
        return [...messageStore].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    // Method to mark message as read
    markMessageAsRead(messageId) {
        const messageIndex = messageStore.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            messageStore[messageIndex].read = true;
        }
    }

    // Method to send a manual reply
    async sendManualReply(phoneNumber, message) {
        if (!this.openPhone) {
            throw new Error('OpenPhone service not initialized');
        }

        await this.openPhone.sendSMS(phoneNumber, message);

        // Store the outbound message
        const outboundMessage = {
            id: Date.now().toString() + '_manual',
            phone_number: phoneNumber,
            body: message,
            direction: 'outbound',
            timestamp: new Date().toISOString(),
            processed: true,
            created_at: new Date().toISOString(),
            read: true
        };

        messageStore.unshift(outboundMessage);
        console.log('📤 Manual reply sent and stored:', outboundMessage);
    }

    getEmergencyFallback(messageBody, conversationHistory = []) {
        // Enhanced fallback logic with conversation context
        const lowerMessage = messageBody.toLowerCase();

        // Check if this is a positive response to a previous message
        if (conversationHistory.length > 0) {
            const lastOutboundMessage = conversationHistory
                .filter(msg => msg.direction === 'outbound')
                .pop();

            if (lastOutboundMessage && (
                lowerMessage.includes('yes') ||
                lowerMessage.includes('sure') ||
                lowerMessage.includes('okay') ||
                lowerMessage.includes('ok') ||
                lowerMessage.includes('sounds good') ||
                lowerMessage.includes('that works') ||
                lowerMessage.includes('please')
            )) {
                // They're agreeing to something we proposed
                if (lastOutboundMessage.body.toLowerCase().includes('schedule') ||
                    lastOutboundMessage.body.toLowerCase().includes('appointment') ||
                    lastOutboundMessage.body.toLowerCase().includes('bring')) {
                    return {
                        reply: "Perfect! I'll get that appointment scheduled for you. I'll be in touch shortly with available times. Thanks for choosing Pink Chicken Speed Shop!",
                        intent: "Booking Confirmation",
                        action: "Schedule appointment and send confirmation"
                    };
                }

                if (lastOutboundMessage.body.toLowerCase().includes('quote') ||
                    lastOutboundMessage.body.toLowerCase().includes('estimate')) {
                    return {
                        reply: "Great! I'll prepare that quote for you and get back to you with the details shortly. Thanks for your business!",
                        intent: "Quote Confirmation",
                        action: "Prepare and send detailed quote"
                    };
                }

                // Generic positive response
                return {
                    reply: "Excellent! I'll take care of that for you right away. I'll be in touch with the next steps. Thanks for choosing us!",
                    intent: "Confirmation",
                    action: "Follow up with confirmed service"
                };
            }
        }

        // Check for emergency keywords
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
            };
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
            };
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
            };
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
            };
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
            };
        }

        // Default response for any other message
        return {
            reply: "Hi! Thanks for your message. I'm Pink Chicken Speed Shop and I received your inquiry. I'll review it and get back to you personally within the hour. My rate is $80/hr. Thanks for choosing us!",
            intent: "General Inquiry",
            action: "Review message and provide personalized response"
        };
    }

    async sendResponse(phoneNumber, aiResponse, messageId) {
        if (!this.openPhone) {
            throw new Error('OpenPhone service not initialized');
        }

        try {
            console.log(`📤 Sending response to ${phoneNumber}: ${aiResponse.reply}`);

            // Send SMS response
            await this.openPhone.sendSMS(phoneNumber, aiResponse.reply);

            console.log('✅ Response sent successfully');

            // Log the action for manual follow-up
            console.log(`📋 Action required: ${aiResponse.action}`);
        }
        catch (error) {
            console.error('❌ Error sending response:', error);

            // Check if it's an authentication error
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                console.error('🔑 OPENPHONE API AUTHENTICATION FAILED!');
                console.error('   - Check if your OpenPhone API key is valid');
                console.error('   - Verify the API key has SMS sending permissions');
                console.error('   - Ensure the phone number is correctly configured');
                console.error(`   - Current API key: ${this.settings?.openphone_api_key?.substring(0, 8)}...`);
                console.error(`   - Current phone number: ${this.settings?.phone_number}`);
            }

            throw error;
        }
    }

    isEmergency(intent) {
        const emergencyKeywords = ['emergency', 'urgent', 'breakdown', 'stranded', 'accident'];
        return emergencyKeywords.some(keyword =>
            intent.toLowerCase().includes(keyword)
        );
    }

    async isDndEnabled() {
        try {
            // Server environment - use environment variable
            return process.env.DND_ENABLED === 'true';
        }
        catch {
            return false;
        }
    }
}

// Export singleton instance
export const messageProcessor = new MessageProcessor();