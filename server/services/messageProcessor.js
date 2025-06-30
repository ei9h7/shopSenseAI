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

    async processIncomingMessage(phoneNumber, messageBody) {
        try {
            console.log(`📨 Processing message from ${phoneNumber}: ${messageBody}`);

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
            console.log('📝 Message stored:', message);

            // Check if Do Not Disturb is enabled
            const isDndEnabled = await this.isDndEnabled();
            console.log(`🔕 DND Status: ${isDndEnabled ? 'Enabled' : 'Disabled'}`);

            if (!isDndEnabled) {
                // Just store the message, don't auto-respond
                console.log('✅ Message received (no auto-response)');
                return;
            }

            // Get conversation history for this phone number (last 30 messages)
            const conversationHistory = this.getConversationHistory(phoneNumber, 30);
            console.log(`📚 Retrieved ${conversationHistory.length} messages of conversation history`);

            // Process with AI if services are available
            if (this.openAI && this.openPhone && this.settings) {
                console.log('🤖 Processing with AI...');
                
                // Use the enhanced context-aware processing
                const aiResponse = await this.openAI.processMessageWithContext(
                    messageBody, 
                    conversationHistory,
                    this.settings.business_name
                );
                
                console.log('🎯 AI Response:', aiResponse);

                // Check for booking confirmation in the action
                if (aiResponse.action && aiResponse.action.includes('BOOKING_CONFIRMED:')) {
                    console.log('📅 Booking confirmation detected, creating appointment...');
                    this.createAppointmentFromBooking(aiResponse.action, phoneNumber);
                }

                // Check if it's an emergency
                if (this.isEmergency(aiResponse.intent)) {
                    console.log('🚨 Emergency detected!');
                    await this.sendResponse(phoneNumber, aiResponse, message.id);
                }
                else {
                    // Send AI response
                    await this.sendResponse(phoneNumber, aiResponse, message.id);
                }
            }
            else {
                console.warn('⚠️  AI services not available - message stored only');
            }
        }
        catch (error) {
            console.error('❌ Error processing message:', error);
            throw error;
        }
    }

    /**
     * Gets conversation history for a specific phone number
     * Now returns more messages for better context
     */
    getConversationHistory(phoneNumber, limit = 30) {
        return this.messages
            .filter(msg => msg.phone_number === phoneNumber)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-limit); // Get the last N messages
    }

    /**
     * Creates an appointment from a booking confirmation action
     */
    createAppointmentFromBooking(bookingAction, phoneNumber) {
        try {
            // Parse the booking confirmation: "BOOKING_CONFIRMED: [Name] | [Phone] | [Vehicle] | [Service] | [Date] | [Time]"
            const bookingData = bookingAction.replace('BOOKING_CONFIRMED:', '').trim();
            const parts = bookingData.split('|').map(part => part.trim());
            
            if (parts.length >= 6) {
                const [customerName, phone, vehicle, service, date, time] = parts;
                
                // Create appointment object
                const appointment = {
                    id: Date.now().toString(),
                    customer_name: customerName,
                    customer_phone: phone || phoneNumber,
                    vehicle_info: vehicle,
                    service_type: service,
                    date: this.parseBookingDate(date),
                    time: this.parseBookingTime(time),
                    duration: 1, // Default 1 hour
                    status: 'scheduled',
                    notes: `Auto-booked from SMS conversation`,
                    created_at: new Date().toISOString()
                };
                
                // Store appointment
                this.appointments.push(appointment);
                console.log('✅ Appointment created:', appointment);
                
                // Update customer record
                this.updateCustomerRecord(phoneNumber, customerName, vehicle, service);
                
                return appointment;
            } else {
                console.warn('⚠️  Invalid booking confirmation format:', bookingAction);
            }
        } catch (error) {
            console.error('❌ Error creating appointment from booking:', error);
        }
        return null;
    }

    /**
     * Parses booking date from natural language
     */
    parseBookingDate(dateStr) {
        const today = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const lowerDate = dateStr.toLowerCase();
        
        // Find the day of the week
        for (let i = 0; i < dayNames.length; i++) {
            if (lowerDate.includes(dayNames[i])) {
                const targetDay = i;
                const currentDay = today.getDay();
                
                // Calculate days until target day
                let daysUntil = targetDay - currentDay;
                if (daysUntil <= 0) {
                    daysUntil += 7; // Next week
                }
                
                const appointmentDate = new Date(today);
                appointmentDate.setDate(today.getDate() + daysUntil);
                return appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            }
        }
        
        // Default to tomorrow if we can't parse
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    /**
     * Parses booking time from natural language
     */
    parseBookingTime(timeStr) {
        const lowerTime = timeStr.toLowerCase();
        
        // Extract time patterns
        const timeMatch = lowerTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const ampm = timeMatch[3];
            
            // Convert to 24-hour format
            if (ampm === 'pm' && hour !== 12) {
                hour += 12;
            } else if (ampm === 'am' && hour === 12) {
                hour = 0;
            }
            
            // Format as HH:MM
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
        
        // Default to 10:00 AM if we can't parse
        return '10:00';
    }

    /**
     * Updates customer record with new information
     */
    updateCustomerRecord(phoneNumber, customerName, vehicle, service) {
        try {
            let customer = this.customers.find(c => c.phone_number === phoneNumber);
            
            if (!customer) {
                // Create new customer
                customer = {
                    id: Date.now().toString(),
                    phone_number: phoneNumber,
                    full_name: customerName,
                    vehicles: [],
                    service_history: [],
                    notes: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                this.customers.push(customer);
                console.log('👤 New customer created:', customer.full_name);
            }
            
            // Update customer name if we have it
            if (customerName && customerName !== 'Name needed') {
                customer.full_name = customerName;
            }
            
            // Add vehicle if new
            if (vehicle && vehicle !== 'Vehicle needed' && !customer.vehicles.some(v => v.details === vehicle)) {
                customer.vehicles.push({
                    details: vehicle,
                    added_at: new Date().toISOString()
                });
                console.log('🚗 Vehicle added to customer:', vehicle);
            }
            
            // Add service history
            if (service && service !== 'Service needed') {
                customer.service_history.push({
                    date: new Date().toISOString(),
                    inquiry: service,
                    type: 'Appointment Booking'
                });
                console.log('🔧 Service history updated:', service);
            }
            
            customer.updated_at = new Date().toISOString();
            
        } catch (error) {
            console.error('❌ Error updating customer record:', error);
        }
    }

    async sendResponse(phoneNumber, aiResponse, messageId) {
        if (!this.openPhone) {
            throw new Error('OpenPhone service not initialized');
        }

        try {
            console.log(`📤 Sending response to ${phoneNumber}: ${aiResponse.reply}`);

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
        }
        catch (error) {
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
            // Server environment - use environment variable
            return process.env.DND_ENABLED === 'true';
        }
        catch {
            return false;
        }
    }

    // API methods for frontend
    getMessages() {
        return this.messages.slice(0, 100); // Return last 100 messages
    }

    getCustomers() {
        return this.customers;
    }

    getQuotes() {
        return this.quotes;
    }

    getAppointments() {
        return this.appointments;
    }

    getTechSheets() {
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
            // Send SMS
            await this.openPhone.sendSMS(phoneNumber, message);

            // Create outbound message record
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
        }
        catch (error) {
            console.error('❌ Error sending manual reply:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const messageProcessor = new MessageProcessor();