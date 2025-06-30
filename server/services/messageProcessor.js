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
                
                console.log('🎯 AI Response received:');
                console.log('   Reply:', aiResponse.reply);
                console.log('   Intent:', aiResponse.intent);
                console.log('   Action:', aiResponse.action);

                // Check for booking confirmation in the action OR reply
                const isBookingConfirmed = this.checkForBookingConfirmation(aiResponse, messageBody, conversationHistory);
                
                if (isBookingConfirmed) {
                    console.log('📅 BOOKING DETECTED! Creating appointment...');
                    const appointment = this.createAppointmentFromConversation(phoneNumber, conversationHistory, messageBody, aiResponse);
                    if (appointment) {
                        console.log('✅ Appointment successfully created:', appointment);
                    } else {
                        console.log('❌ Failed to create appointment');
                    }
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
     * Enhanced booking detection that looks for multiple indicators
     */
    checkForBookingConfirmation(aiResponse, currentMessage, conversationHistory) {
        const indicators = [
            // Direct booking confirmation in action
            aiResponse.action && aiResponse.action.includes('BOOKING_CONFIRMED:'),
            
            // Booking language in reply
            aiResponse.reply && (
                aiResponse.reply.toLowerCase().includes('scheduled') ||
                aiResponse.reply.toLowerCase().includes('booked') ||
                aiResponse.reply.toLowerCase().includes('appointment confirmed') ||
                aiResponse.reply.toLowerCase().includes('see you on') ||
                aiResponse.reply.toLowerCase().includes('see you thursday') ||
                aiResponse.reply.toLowerCase().includes('see you monday') ||
                aiResponse.reply.toLowerCase().includes('see you tuesday') ||
                aiResponse.reply.toLowerCase().includes('see you wednesday') ||
                aiResponse.reply.toLowerCase().includes('see you friday')
            ),
            
            // Intent indicates booking
            aiResponse.intent && (
                aiResponse.intent.toLowerCase().includes('booking') ||
                aiResponse.intent.toLowerCase().includes('appointment') ||
                aiResponse.intent.toLowerCase().includes('scheduled')
            ),
            
            // Current message confirms appointment
            currentMessage && (
                currentMessage.toLowerCase().includes('thursday at 10') ||
                currentMessage.toLowerCase().includes('book') ||
                currentMessage.toLowerCase().includes('schedule') ||
                currentMessage.toLowerCase().includes('appointment')
            )
        ];
        
        const detectedIndicators = indicators.filter(Boolean);
        console.log(`🔍 Booking detection check: ${detectedIndicators.length} indicators found`);
        console.log('   Indicators:', indicators.map((ind, i) => `${i}: ${ind}`));
        
        return detectedIndicators.length > 0;
    }

    /**
     * Creates appointment from conversation context
     */
    createAppointmentFromConversation(phoneNumber, conversationHistory, currentMessage, aiResponse) {
        try {
            console.log('📅 Creating appointment from conversation...');
            
            // Extract customer information from conversation
            const customerInfo = this.extractCustomerInfoFromConversation(conversationHistory, phoneNumber);
            console.log('👤 Customer info extracted:', customerInfo);
            
            // Extract appointment details
            const appointmentDetails = this.extractAppointmentDetails(conversationHistory, currentMessage, aiResponse);
            console.log('📋 Appointment details extracted:', appointmentDetails);
            
            // Create appointment object
            const appointment = {
                id: Date.now().toString(),
                customer_name: customerInfo.name || 'Customer',
                customer_phone: phoneNumber,
                vehicle_info: customerInfo.vehicle || 'Vehicle TBD',
                service_type: customerInfo.service || 'Service TBD',
                date: appointmentDetails.date,
                time: appointmentDetails.time,
                duration: 1, // Default 1 hour
                status: 'scheduled',
                notes: `Auto-booked from SMS: "${currentMessage}"`,
                created_at: new Date().toISOString()
            };
            
            // Store appointment
            this.appointments.push(appointment);
            console.log('✅ Appointment stored in memory:', appointment);
            
            // Update customer record
            this.updateCustomerRecord(phoneNumber, customerInfo.name, customerInfo.vehicle, customerInfo.service);
            
            return appointment;
        } catch (error) {
            console.error('❌ Error creating appointment:', error);
            return null;
        }
    }

    /**
     * Extracts customer info from conversation history
     */
    extractCustomerInfoFromConversation(conversationHistory, phoneNumber) {
        let name = null;
        let vehicle = null;
        let service = null;
        
        // Look through conversation for customer details
        conversationHistory.forEach(msg => {
            const text = msg.body.toLowerCase();
            
            // Look for name patterns
            if (!name) {
                const nameMatch = text.match(/(?:my name is|i'm|this is|call me)\s+([a-zA-Z]+)/i);
                if (nameMatch) {
                    name = nameMatch[1];
                }
            }
            
            // Look for vehicle patterns
            if (!vehicle) {
                const vehicleMatch = text.match(/(\d{4})\s+(ford|chevy|chevrolet|dodge|toyota|honda|nissan|bmw|mercedes|audi|volkswagen|vw|subaru|mazda|hyundai|kia|jeep|ram|gmc|cadillac|buick|lincoln|acura|infiniti|lexus|volvo)\s+(\w+)/i);
                if (vehicleMatch) {
                    vehicle = `${vehicleMatch[1]} ${vehicleMatch[2]} ${vehicleMatch[3]}`;
                } else {
                    const simpleVehicleMatch = text.match(/(ford|chevy|chevrolet|dodge|toyota|honda|nissan|bmw|mercedes|audi|volkswagen|vw|subaru|mazda|hyundai|kia|jeep|ram|gmc|cadillac|buick|lincoln|acura|infiniti|lexus|volvo)\s+(\w+)/i);
                    if (simpleVehicleMatch) {
                        vehicle = `${simpleVehicleMatch[1]} ${simpleVehicleMatch[2]}`;
                    }
                }
            }
            
            // Look for service patterns
            if (!service) {
                const services = ['oil change', 'brake', 'tire', 'transmission', 'engine', 'battery', 'tune up', 'inspection'];
                for (const svc of services) {
                    if (text.includes(svc)) {
                        service = svc;
                        break;
                    }
                }
            }
        });
        
        return { name, vehicle, service };
    }

    /**
     * Extracts appointment date and time from conversation
     */
    extractAppointmentDetails(conversationHistory, currentMessage, aiResponse) {
        const allText = [
            ...conversationHistory.map(msg => msg.body),
            currentMessage,
            aiResponse.reply,
            aiResponse.action
        ].join(' ').toLowerCase();
        
        console.log('🔍 Analyzing text for appointment details:', allText.substring(0, 200) + '...');
        
        // Extract date
        let date = this.parseBookingDate(allText);
        let time = this.parseBookingTime(allText);
        
        console.log(`📅 Parsed date: ${date}, time: ${time}`);
        
        return { date, time };
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
     * Parses booking date from natural language
     */
    parseBookingDate(text) {
        const today = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const lowerText = text.toLowerCase();
        
        console.log('📅 Parsing date from text:', lowerText.substring(0, 100));
        
        // Find the day of the week
        for (let i = 0; i < dayNames.length; i++) {
            if (lowerText.includes(dayNames[i])) {
                const targetDay = i;
                const currentDay = today.getDay();
                
                console.log(`📅 Found day: ${dayNames[i]} (${targetDay}), current day: ${currentDay}`);
                
                // Calculate days until target day
                let daysUntil = targetDay - currentDay;
                if (daysUntil <= 0) {
                    daysUntil += 7; // Next week
                }
                
                const appointmentDate = new Date(today);
                appointmentDate.setDate(today.getDate() + daysUntil);
                const dateStr = appointmentDate.toISOString().split('T')[0];
                
                console.log(`📅 Calculated appointment date: ${dateStr} (${daysUntil} days from now)`);
                return dateStr;
            }
        }
        
        // Default to tomorrow if we can't parse
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        console.log(`📅 Using default date (tomorrow): ${dateStr}`);
        return dateStr;
    }

    /**
     * Parses booking time from natural language
     */
    parseBookingTime(text) {
        const lowerText = text.toLowerCase();
        
        console.log('🕐 Parsing time from text:', lowerText.substring(0, 100));
        
        // Extract time patterns
        const timeMatch = lowerText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const ampm = timeMatch[3];
            
            console.log(`🕐 Found time components: hour=${hour}, minute=${minute}, ampm=${ampm}`);
            
            // Convert to 24-hour format
            if (ampm === 'pm' && hour !== 12) {
                hour += 12;
            } else if (ampm === 'am' && hour === 12) {
                hour = 0;
            } else if (!ampm && hour < 8) {
                // Assume PM for hours less than 8 (like 10 = 10am)
                // Actually, let's assume AM for business hours
            }
            
            // Format as HH:MM
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            console.log(`🕐 Formatted time: ${timeStr}`);
            return timeStr;
        }
        
        // Look for specific time mentions
        if (lowerText.includes('10am') || lowerText.includes('10 am')) {
            console.log('🕐 Found 10am mention');
            return '10:00';
        }
        if (lowerText.includes('10pm') || lowerText.includes('10 pm')) {
            console.log('🕐 Found 10pm mention');
            return '22:00';
        }
        
        // Default to 10:00 AM if we can't parse
        console.log('🕐 Using default time: 10:00');
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
            if (customerName && customerName !== 'Customer') {
                customer.full_name = customerName;
            }
            
            // Add vehicle if new
            if (vehicle && vehicle !== 'Vehicle TBD' && !customer.vehicles.some(v => v.details === vehicle)) {
                customer.vehicles.push({
                    details: vehicle,
                    added_at: new Date().toISOString()
                });
                console.log('🚗 Vehicle added to customer:', vehicle);
            }
            
            // Add service history
            if (service && service !== 'Service TBD') {
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
        console.log(`📊 Returning ${this.appointments.length} appointments:`, this.appointments);
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