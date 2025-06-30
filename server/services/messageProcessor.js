import { OpenAIService } from './openai.js';
import { OpenPhoneService } from './openphone.js';

export class MessageProcessor {
    openAI = null;
    openPhone = null;
    settings = null;
    customers = [];
    quotes = [];
    appointments = [];
    techSheets = [];
    messages = [];

    async initialize() {
        try {
            console.log('🔄 Initializing MessageProcessor...');
            
            // Server environment - use environment variables
            this.settings = {
                business_name: process.env.BUSINESS_NAME || 'Pink Chicken Speed Shop',
                labor_rate: parseInt(process.env.LABOR_RATE || '80'),
                openai_api_key: process.env.OPENAI_API_KEY || '',
                openphone_api_key: process.env.OPENPHONE_API_KEY || '',
                phone_number: process.env.OPENPHONE_PHONE_NUMBER || '',
                dnd_enabled: process.env.DND_ENABLED === 'true'
            };

            console.log('⚙️ Settings loaded:', {
                business_name: this.settings.business_name,
                labor_rate: this.settings.labor_rate,
                has_openai_key: !!this.settings.openai_api_key,
                has_openphone_key: !!this.settings.openphone_api_key,
                has_phone_number: !!this.settings.phone_number,
                dnd_enabled: this.settings.dnd_enabled
            });

            // Initialize services if API keys are available
            if (this.settings.openai_api_key) {
                try {
                    this.openAI = new OpenAIService(this.settings.openai_api_key);
                    console.log('✅ OpenAI service initialized');
                } catch (error) {
                    console.error('❌ Failed to initialize OpenAI service:', error);
                }
            } else {
                console.warn('⚠️ OpenAI API key not found');
            }

            if (this.settings.openphone_api_key && this.settings.phone_number) {
                try {
                    this.openPhone = new OpenPhoneService(this.settings.openphone_api_key, this.settings.phone_number);
                    console.log('✅ OpenPhone service initialized');
                } catch (error) {
                    console.error('❌ Failed to initialize OpenPhone service:', error);
                }
            } else {
                console.warn('⚠️ OpenPhone API key or phone number not found');
            }

            console.log('✅ MessageProcessor initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize MessageProcessor:', error);
            throw error;
        }
    }

    async processIncomingMessage(phoneNumber, messageBody) {
        try {
            console.log(`📨 Processing message from ${phoneNumber}: "${messageBody}"`);

            // Validate inputs
            if (!phoneNumber || !messageBody) {
                throw new Error('Missing phone number or message body');
            }

            // Create new message object
            const message = {
                id: Date.now().toString(),
                phone_number: phoneNumber,
                body: messageBody,
                direction: 'inbound',
                timestamp: new Date().toISOString(),
                processed: false,
                created_at: new Date().toISOString()
            };

            // Store message
            this.messages.unshift(message);
            console.log('📝 Message stored');

            // Check if Do Not Disturb is enabled
            const isDndEnabled = await this.isDndEnabled();
            console.log(`🔕 DND Status: ${isDndEnabled ? 'Enabled' : 'Disabled'}`);

            if (!isDndEnabled) {
                console.log('✅ Message received (no auto-response due to DND)');
                return;
            }

            // Process with AI if services are available
            if (this.openAI && this.openPhone && this.settings) {
                console.log('🤖 Processing with AI...');
                
                try {
                    const aiResponse = await this.openAI.processMessage(
                        messageBody, 
                        this.settings.business_name
                    );

                    console.log('🎯 AI Response received:', aiResponse);

                    // Check if it's an emergency
                    if (this.isEmergency(aiResponse.intent)) {
                        console.log('🚨 Emergency detected!');
                    }

                    // Send AI response
                    await this.sendResponse(phoneNumber, aiResponse, message.id);
                } catch (aiError) {
                    console.error('❌ AI processing error:', aiError);
                    // Continue without AI response
                }
            } else {
                console.warn('⚠️ AI services not available - message stored only');
            }
        } catch (error) {
            console.error('❌ Error processing message:', error);
            throw error;
        }
    }

    async sendResponse(phoneNumber, aiResponse, messageId) {
        if (!this.openPhone) {
            throw new Error('OpenPhone service not initialized');
        }

        try {
            console.log(`📤 Sending response to ${phoneNumber}: "${aiResponse.reply}"`);

            // Send SMS response
            await this.openPhone.sendSMS(phoneNumber, aiResponse.reply);

            // Create outbound message
            const outboundMessage = {
                id: Date.now().toString() + '_out',
                phone_number: phoneNumber,
                body: aiResponse.reply,
                direction: 'outbound',
                timestamp: new Date().toISOString(),
                processed: true,
                created_at: new Date().toISOString()
            };

            // Store outbound message
            this.messages.unshift(outboundMessage);

            // Update original message with AI response data
            const messageIndex = this.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
                this.messages[messageIndex] = {
                    ...this.messages[messageIndex],
                    processed: true,
                    ai_response: aiResponse.reply,
                    intent: aiResponse.intent,
                    action: aiResponse.action
                };
            }

            console.log('✅ AI response sent successfully');
        } catch (error) {
            console.error('❌ Error sending response:', error);
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
            return process.env.DND_ENABLED === 'true';
        } catch {
            return false;
        }
    }

    // API methods for frontend
    getMessages() {
        return this.messages.slice(0, 100);
    }

    getCustomers() {
        return this.customers;
    }

    getQuotes() {
        console.log(`📊 Returning ${this.quotes.length} quotes`);
        return this.quotes;
    }

    getAppointments() {
        console.log(`📊 Returning ${this.appointments.length} appointments`);
        return this.appointments;
    }

    getTechSheets() {
        console.log(`📊 Returning ${this.techSheets.length} tech sheets`);
        return this.techSheets;
    }

    markMessageAsRead(messageId) {
        const messageIndex = this.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            this.messages[messageIndex].read = true;
        }
    }

    async sendManualReply(phoneNumber, message) {
        if (!this.openPhone) {
            throw new Error('OpenPhone service not initialized');
        }

        try {
            await this.openPhone.sendSMS(phoneNumber, message);

            const outboundMessage = {
                id: Date.now().toString() + '_manual',
                phone_number: phoneNumber,
                body: message,
                direction: 'outbound',
                timestamp: new Date().toISOString(),
                processed: true,
                created_at: new Date().toISOString()
            };

            this.messages.unshift(outboundMessage);
            console.log('✅ Manual reply sent successfully');
        } catch (error) {
            console.error('❌ Error sending manual reply:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const messageProcessor = new MessageProcessor();