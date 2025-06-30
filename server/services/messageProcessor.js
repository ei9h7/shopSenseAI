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

            // Load existing data
            this.loadStoredData();

            console.log('✅ MessageProcessor initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize MessageProcessor:', error);
            throw error;
        }
    }

    loadStoredData() {
        // In a real implementation, this would load from a database
        // For now, we'll initialize with empty arrays
        this.customers = [];
        this.quotes = [];
        this.appointments = [];
        this.techSheets = [];
        this.messages = [];
        console.log('📊 Data storage initialized');
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
                    // Get conversation history for better context
                    const conversationHistory = this.getConversationHistory(phoneNumber);
                    
                    const aiResponse = await this.openAI.processMessageWithContext(
                        messageBody, 
                        conversationHistory,
                        this.settings.business_name
                    );

                    console.log('🎯 AI Response received:', aiResponse);

                    // Check if it's an emergency
                    if (this.isEmergency(aiResponse.intent)) {
                        console.log('🚨 Emergency detected!');
                    }

                    // Check for booking confirmation
                    if (this.isBookingConfirmation(aiResponse.action)) {
                        console.log('📅 Booking confirmation detected!');
                        await this.handleBookingConfirmation(phoneNumber, aiResponse, messageBody);
                    }

                    // Check for quote acceptance
                    if (this.isQuoteAcceptance(aiResponse.action)) {
                        console.log('💰 Quote acceptance detected!');
                        await this.handleQuoteAcceptance(phoneNumber, aiResponse);
                    }

                    // Send AI response
                    await this.sendResponse(phoneNumber, aiResponse, message.id);
                } catch (aiError) {
                    console.error('❌ AI processing error:', aiError);
                    // Send fallback response
                    const fallbackResponse = this.getFallbackResponse(messageBody);
                    await this.sendResponse(phoneNumber, fallbackResponse, message.id);
                }
            } else {
                console.warn('⚠️ AI services not available - message stored only');
            }
        } catch (error) {
            console.error('❌ Error processing message:', error);
            throw error;
        }
    }

    getConversationHistory(phoneNumber) {
        // Get last 10 messages for this phone number
        return this.messages
            .filter(msg => msg.phone_number === phoneNumber)
            .slice(0, 10)
            .reverse(); // Oldest first for context
    }

    isBookingConfirmation(action) {
        if (!action) return false;
        const lowerAction = action.toLowerCase();
        return lowerAction.includes('booking_confirmed') || 
               lowerAction.includes('appointment') ||
               lowerAction.includes('schedule');
    }

    isQuoteAcceptance(action) {
        if (!action) return false;
        const lowerAction = action.toLowerCase();
        return lowerAction.includes('quote') && 
               (lowerAction.includes('accept') || lowerAction.includes('confirm'));
    }

    async handleBookingConfirmation(phoneNumber, aiResponse, originalMessage) {
        try {
            console.log('📅 Processing booking confirmation...');
            
            // Extract booking details from AI response action
            const bookingDetails = this.extractBookingDetails(aiResponse.action, originalMessage, phoneNumber);
            
            if (bookingDetails) {
                // Create appointment
                const appointment = {
                    id: Date.now().toString(),
                    customer_name: bookingDetails.customerName || 'Customer',
                    customer_phone: phoneNumber,
                    vehicle_info: bookingDetails.vehicle || 'Vehicle TBD',
                    service_type: bookingDetails.service || 'Service TBD',
                    date: bookingDetails.date || this.getNextBusinessDay(),
                    time: bookingDetails.time || '10:00',
                    duration: this.estimateServiceDuration(bookingDetails.service),
                    status: 'scheduled',
                    notes: `Auto-booked from SMS: "${originalMessage}"`,
                    created_at: new Date().toISOString(),
                    source: 'sms_booking'
                };

                // Store appointment
                this.appointments.unshift(appointment);
                
                console.log('✅ Appointment created:', appointment);
                
                // Update customer record
                this.updateCustomerRecord(phoneNumber, {
                    name: bookingDetails.customerName,
                    vehicle: bookingDetails.vehicle,
                    lastService: bookingDetails.service
                });

                return appointment;
            }
        } catch (error) {
            console.error('❌ Error handling booking confirmation:', error);
        }
        return null;
    }

    async handleQuoteAcceptance(phoneNumber, aiResponse) {
        try {
            console.log('💰 Processing quote acceptance...');
            
            // Find the most recent quote for this customer
            const customerQuote = this.quotes.find(q => q.customer_phone === phoneNumber && q.status === 'sent');
            
            if (customerQuote) {
                // Update quote status
                customerQuote.status = 'accepted';
                customerQuote.accepted_at = new Date().toISOString();
                
                console.log('✅ Quote accepted:', customerQuote.id);
                
                // Auto-create appointment for accepted quote
                const appointment = {
                    id: Date.now().toString(),
                    customer_name: customerQuote.customer_name,
                    customer_phone: phoneNumber,
                    vehicle_info: customerQuote.vehicle_info,
                    service_type: customerQuote.description,
                    date: this.getNextBusinessDay(),
                    time: '10:00',
                    duration: customerQuote.labor_hours,
                    status: 'scheduled',
                    notes: `Auto-booked from accepted quote #${customerQuote.id}`,
                    created_at: new Date().toISOString(),
                    quote_id: customerQuote.id,
                    source: 'quote_acceptance'
                };

                this.appointments.unshift(appointment);
                console.log('📅 Appointment auto-created from quote acceptance');
                
                return { quote: customerQuote, appointment };
            }
        } catch (error) {
            console.error('❌ Error handling quote acceptance:', error);
        }
        return null;
    }

    extractBookingDetails(action, message, phoneNumber) {
        try {
            // Look for BOOKING_CONFIRMED format in action
            if (action && action.includes('BOOKING_CONFIRMED:')) {
                const parts = action.split('BOOKING_CONFIRMED:')[1].split('|').map(p => p.trim());
                return {
                    customerName: parts[0] || null,
                    phone: parts[1] || phoneNumber,
                    vehicle: parts[2] || null,
                    service: parts[3] || null,
                    date: parts[4] || null,
                    time: parts[5] || null
                };
            }

            // Extract from message content using patterns
            const lowerMessage = message.toLowerCase();
            
            // Look for time patterns
            const timeMatch = lowerMessage.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
            const dayMatch = lowerMessage.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
            
            // Look for service patterns
            let service = null;
            const serviceKeywords = ['oil change', 'brake', 'tire', 'battery', 'tune up', 'inspection'];
            for (const keyword of serviceKeywords) {
                if (lowerMessage.includes(keyword)) {
                    service = keyword;
                    break;
                }
            }

            return {
                customerName: null, // Will be filled from customer records
                vehicle: null, // Will be filled from customer records
                service: service,
                date: dayMatch ? dayMatch[1] : null,
                time: timeMatch ? timeMatch[1] : null
            };
        } catch (error) {
            console.error('Error extracting booking details:', error);
            return null;
        }
    }

    estimateServiceDuration(service) {
        if (!service) return 1;
        
        const lowerService = service.toLowerCase();
        if (lowerService.includes('oil change')) return 0.5;
        if (lowerService.includes('brake')) return 2;
        if (lowerService.includes('tire')) return 1;
        if (lowerService.includes('battery')) return 0.5;
        if (lowerService.includes('transmission')) return 4;
        if (lowerService.includes('engine')) return 6;
        
        return 1; // Default 1 hour
    }

    getNextBusinessDay() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        // If tomorrow is weekend, move to Monday
        if (tomorrow.getDay() === 0) { // Sunday
            tomorrow.setDate(tomorrow.getDate() + 1);
        } else if (tomorrow.getDay() === 6) { // Saturday
            tomorrow.setDate(tomorrow.getDate() + 2);
        }
        
        return tomorrow.toISOString().split('T')[0];
    }

    updateCustomerRecord(phoneNumber, details) {
        try {
            let customer = this.customers.find(c => c.phone_number === phoneNumber);
            
            if (!customer) {
                // Create new customer
                customer = {
                    id: Date.now().toString(),
                    phone_number: phoneNumber,
                    first_name: details.name ? details.name.split(' ')[0] : null,
                    last_name: details.name ? details.name.split(' ').slice(1).join(' ') : null,
                    full_name: details.name || null,
                    vehicles: [],
                    service_history: [],
                    notes: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_repeat_customer: false
                };
                this.customers.unshift(customer);
                console.log('👤 New customer created');
            } else {
                customer.is_repeat_customer = true;
                customer.updated_at = new Date().toISOString();
                console.log('👤 Existing customer updated');
            }

            // Add vehicle if provided
            if (details.vehicle && !customer.vehicles.some(v => v.details === details.vehicle)) {
                customer.vehicles.push({
                    details: details.vehicle,
                    added_at: new Date().toISOString()
                });
            }

            // Add service history
            if (details.lastService) {
                customer.service_history.unshift({
                    date: new Date().toISOString(),
                    inquiry: details.lastService,
                    type: 'SMS Booking'
                });
            }

            return customer;
        } catch (error) {
            console.error('Error updating customer record:', error);
            return null;
        }
    }

    getFallbackResponse(messageBody) {
        const lowerMessage = messageBody.toLowerCase();
        
        // Emergency detection
        if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
            return {
                reply: "🚨 EMERGENCY RECEIVED! I got your urgent message and will respond immediately. If you're in immediate danger, please call 911. Otherwise, I'll contact you within 15 minutes. Stay safe!",
                intent: "Emergency",
                action: "URGENT - Contact customer immediately"
            };
        }

        // Booking requests
        if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') || lowerMessage.includes('book')) {
            return {
                reply: "I'd be happy to schedule an appointment for you! We're open Monday-Friday, 8am-5pm. What day and time works best for you?",
                intent: "Booking Request",
                action: "Collect preferred appointment time"
            };
        }

        // Quote requests
        if (lowerMessage.includes('quote') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
            return {
                reply: "Thanks for your quote request! I'd be happy to provide an estimate. My labor rate is $80/hr with a 1-hour minimum. What vehicle and what service are you looking to get done?",
                intent: "Quote Request",
                action: "Collect vehicle and service details for quote"
            };
        }

        // Default response
        return {
            reply: "Hi! Thanks for your message. I'm Pink Chicken Speed Shop and I'd be happy to help with your automotive needs. My rate is $80/hr. What can I help you with today?",
            intent: "General Inquiry",
            action: "Understand customer need"
        };
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