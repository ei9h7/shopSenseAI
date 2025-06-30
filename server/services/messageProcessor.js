import { OpenAIService } from './openai.js';
import { OpenPhoneService } from './openphone.js';

// Simple in-memory storage for messages (in production, use a database)
let messageStore = []

// Customer database storage (in production, use a proper database)
let customerDatabase = []

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
                // Initialize OpenPhone service (phoneNumberId will be set later from webhook)
                this.openPhone = new OpenPhoneService(this.settings.openphone_api_key, this.settings.phone_number);
                console.log('✅ OpenPhone service initialized');
                console.log(`📱 Using OpenPhone number: ${this.settings.phone_number}`);
                console.log(`🔑 OpenPhone API key: ${this.settings.openphone_api_key.substring(0, 8)}...`);
            }
            else {
                console.warn('⚠️  OpenPhone API key or phone number not found');
            }

            // Load existing customer database
            this.loadCustomerDatabase();

            console.log('🤖 MessageProcessor initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize MessageProcessor:', error);
        }
    }

    /**
     * Loads customer database from storage (in production, this would be a real database)
     */
    loadCustomerDatabase() {
        try {
            // In production, this would load from a database
            // For now, we'll use a simple in-memory store
            console.log('📊 Customer database loaded');
        } catch (error) {
            console.error('❌ Error loading customer database:', error);
        }
    }

    /**
     * Updates or creates customer record
     */
    updateCustomerRecord(phoneNumber, customerData, messageBody) {
        try {
            // Find existing customer or create new one
            let customer = customerDatabase.find(c => c.phone_number === phoneNumber);
            
            if (!customer) {
                customer = {
                    id: Date.now().toString(),
                    phone_number: phoneNumber,
                    first_name: null,
                    last_name: null,
                    full_name: null,
                    address: null,
                    is_repeat_customer: null,
                    vehicles: [],
                    service_history: [],
                    notes: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                customerDatabase.push(customer);
                console.log('👤 New customer record created');
            }

            // Update customer data if provided
            if (customerData) {
                if (customerData.firstName) customer.first_name = customerData.firstName;
                if (customerData.lastName) customer.last_name = customerData.lastName;
                if (customerData.fullName) customer.full_name = customerData.fullName;
                if (customerData.address) customer.address = customerData.address;
                if (customerData.isRepeatCustomer !== null) customer.is_repeat_customer = customerData.isRepeatCustomer;
                
                // Update vehicle information
                if (customerData.vehicle && customerData.vehicle.details) {
                    const existingVehicle = customer.vehicles.find(v => v.details === customerData.vehicle.details);
                    if (!existingVehicle) {
                        customer.vehicles.push({
                            year: customerData.vehicle.year,
                            make: customerData.vehicle.make,
                            model: customerData.vehicle.model,
                            details: customerData.vehicle.details,
                            added_at: new Date().toISOString()
                        });
                        console.log('🚗 Vehicle added to customer record');
                    }
                }

                customer.updated_at = new Date().toISOString();
                console.log('👤 Customer record updated:', {
                    name: customer.full_name || 'Unknown',
                    phone: customer.phone_number,
                    vehicles: customer.vehicles.length,
                    isRepeat: customer.is_repeat_customer
                });
            }

            // Add service inquiry to history
            customer.service_history.push({
                date: new Date().toISOString(),
                inquiry: messageBody,
                type: 'sms_inquiry'
            });

            return customer;
        } catch (error) {
            console.error('❌ Error updating customer record:', error);
            return null;
        }
    }

    /**
     * Gets customer record by phone number
     */
    getCustomerRecord(phoneNumber) {
        return customerDatabase.find(c => c.phone_number === phoneNumber) || null;
    }

    /**
     * Gets conversation history from OpenPhone API with improved error handling
     * This ensures we always have the complete, authoritative conversation history
     */
    async getConversationHistoryFromOpenPhone(phoneNumber) {
        if (!this.openPhone) {
            console.warn('⚠️ OpenPhone service not available');
            return [];
        }

        try {
            console.log(`📞 Fetching conversation history from OpenPhone for ${phoneNumber}`);
            
            // Use the improved conversation history method
            const conversationMessages = await this.openPhone.getConversationHistory(phoneNumber, 10);
            
            console.log(`📚 Retrieved ${conversationMessages.length} messages from OpenPhone for context`);
            
            // Log the conversation context for debugging
            if (conversationMessages.length > 0) {
                console.log('💬 Conversation context:');
                conversationMessages.forEach((msg, index) => {
                    console.log(`   ${index + 1}. ${msg.direction.toUpperCase()}: "${msg.body.substring(0, 50)}..."`);
                });
            }
            
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

                    // Update customer database with any collected information
                    if (aiResponse.customerData) {
                        this.updateCustomerRecord(phoneNumber, aiResponse.customerData, messageBody);
                    }
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
                        customer_data: aiResponse.customerData || {},
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

                    // Log customer data collection progress
                    if (aiResponse.intent.includes('Data Collection')) {
                        console.log('📋 CUSTOMER DATA COLLECTION IN PROGRESS');
                        const customer = this.getCustomerRecord(phoneNumber);
                        if (customer) {
                            console.log(`👤 Customer: ${customer.full_name || 'Name pending'}`);
                            console.log(`🏠 Address: ${customer.address || 'Not collected'}`);
                            console.log(`🚗 Vehicles: ${customer.vehicles.length} on file`);
                            console.log(`🔄 Repeat Customer: ${customer.is_repeat_customer !== null ? (customer.is_repeat_customer ? 'Yes' : 'No') : 'Unknown'}`);
                        }
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

    // Method to get customer database (for API endpoint)
    getCustomers() {
        return [...customerDatabase].sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
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
        // Enhanced fallback logic with conversation context and customer data collection
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
                        reply: "Perfect! I'll get that appointment scheduled for you. Can I get your name for our appointment book?",
                        intent: "Booking Confirmation + Data Collection",
                        action: "Schedule appointment and collect customer name",
                        customerData: {}
                    };
                }

                if (lastOutboundMessage.body.toLowerCase().includes('quote') ||
                    lastOutboundMessage.body.toLowerCase().includes('estimate')) {
                    return {
                        reply: "Great! I'll prepare that quote for you. What's your name so I can personalize the quote?",
                        intent: "Quote Confirmation + Data Collection",
                        action: "Prepare quote and collect customer name",
                        customerData: {}
                    };
                }

                // Generic positive response
                return {
                    reply: "Excellent! I'll take care of that for you. Can I get your name to help you properly?",
                    intent: "Confirmation + Data Collection",
                    action: "Follow up with confirmed service and collect name",
                    customerData: {}
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
                action: "URGENT - Contact customer immediately",
                customerData: {}
            };
        }

        // Service/maintenance requests
        if (lowerMessage.includes('oil change') ||
            lowerMessage.includes('service') ||
            lowerMessage.includes('maintenance') ||
            lowerMessage.includes('tune up') ||
            lowerMessage.includes('inspection')) {
            return {
                reply: "Hi! Thanks for reaching out about service. I'd be happy to help with your vehicle maintenance. My rate is $80/hr with a 1-hour minimum. Can I get your name to get started?",
                intent: "Service Request + Data Collection",
                action: "Follow up with service quote and collect customer name",
                customerData: {}
            };
        }

        // Quote requests
        if (lowerMessage.includes('quote') ||
            lowerMessage.includes('price') ||
            lowerMessage.includes('cost') ||
            lowerMessage.includes('estimate') ||
            lowerMessage.includes('how much')) {
            return {
                reply: "Thanks for your quote request! I'd be happy to provide an estimate. My labor rate is $80/hr with a 1-hour minimum. What's your name so I can prepare a personalized quote?",
                intent: "Quote Request + Data Collection",
                action: "Prepare detailed quote and collect customer name",
                customerData: {}
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
                reply: "I received your message about the issue with your vehicle. I'll take a look at what you've described and get back to you with next steps. My diagnostic rate is $80/hr. What's your name so I can help you properly?",
                intent: "Repair Request + Data Collection",
                action: "Diagnose issue and collect customer name",
                customerData: {}
            };
        }

        // Booking/appointment requests
        if (lowerMessage.includes('appointment') ||
            lowerMessage.includes('schedule') ||
            lowerMessage.includes('book') ||
            lowerMessage.includes('available') ||
            lowerMessage.includes('when can')) {
            return {
                reply: "Thanks for wanting to schedule service! I'll check my availability and get back to you with some time options. My rate is $80/hr with a 1-hour minimum. Can I get your name for the appointment?",
                intent: "Booking Request + Data Collection",
                action: "Check schedule and collect customer name",
                customerData: {}
            };
        }

        // Default response for any other message
        return {
            reply: "Hi! Thanks for your message. I'm Pink Chicken Speed Shop and I received your inquiry. I'll review it and get back to you personally within the hour. My rate is $80/hr. What's your name so I can assist you properly?",
            intent: "General Inquiry + Data Collection",
            action: "Review message and collect customer name",
            customerData: {}
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