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
            console.log(`📨 Processing message from ${phoneNumber}: "${messageBody}"`);

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
                console.log('   Reply:', aiResponse.reply.substring(0, 100) + '...');
                console.log('   Intent:', aiResponse.intent);
                console.log('   Action:', aiResponse.action);

                // Check for booking confirmation - IMPROVED DETECTION
                const isBookingConfirmed = this.checkForBookingConfirmation(aiResponse, messageBody, conversationHistory);
                
                if (isBookingConfirmed) {
                    console.log('📅 BOOKING DETECTED! Creating appointment...');
                    const appointment = this.createAppointmentFromConversation(phoneNumber, conversationHistory, messageBody, aiResponse);
                    if (appointment) {
                        console.log('✅ Appointment successfully created:', appointment);
                        
                        // Generate tech sheet for the appointment
                        if (appointment.service_type && appointment.service_type !== 'Service TBD') {
                            console.log('🔧 Generating tech sheet for appointment...');
                            const techSheet = this.generateTechSheetFromAppointment(appointment);
                            if (techSheet) {
                                console.log('✅ Tech sheet generated:', techSheet.title);
                            }
                        }
                    } else {
                        console.log('❌ Failed to create appointment');
                    }
                }

                // Check if it's an emergency
                if (this.isEmergency(aiResponse.intent)) {
                    console.log('🚨 Emergency detected!');
                }

                // Send AI response
                await this.sendResponse(phoneNumber, aiResponse, message.id);
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
     * IMPROVED booking detection that looks for multiple indicators
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
                aiResponse.reply.toLowerCase().includes('see you friday') ||
                aiResponse.reply.toLowerCase().includes('i can schedule you') ||
                aiResponse.reply.toLowerCase().includes('i\'ll get that scheduled')
            ),
            
            // Intent indicates booking
            aiResponse.intent && (
                aiResponse.intent.toLowerCase().includes('booking confirmation') ||
                aiResponse.intent.toLowerCase().includes('appointment') ||
                aiResponse.intent.toLowerCase().includes('scheduled')
            ),
            
            // Current message confirms appointment with specific time
            currentMessage && (
                (currentMessage.toLowerCase().includes('thursday') && currentMessage.toLowerCase().includes('10')) ||
                (currentMessage.toLowerCase().includes('monday') && currentMessage.toLowerCase().includes('am')) ||
                (currentMessage.toLowerCase().includes('tuesday') && currentMessage.toLowerCase().includes('am')) ||
                (currentMessage.toLowerCase().includes('wednesday') && currentMessage.toLowerCase().includes('am')) ||
                (currentMessage.toLowerCase().includes('friday') && currentMessage.toLowerCase().includes('am')) ||
                (currentMessage.toLowerCase().includes('book') && currentMessage.toLowerCase().includes('am')) ||
                (currentMessage.toLowerCase().includes('schedule') && currentMessage.toLowerCase().includes('am'))
            )
        ];
        
        const detectedIndicators = indicators.filter(Boolean);
        console.log(`🔍 Booking detection check: ${detectedIndicators.length} indicators found`);
        
        return detectedIndicators.length >= 1; // At least 1 indicator needed
    }

    /**
     * IMPROVED appointment creation from conversation context
     */
    createAppointmentFromConversation(phoneNumber, conversationHistory, currentMessage, aiResponse) {
        try {
            console.log('📅 Creating appointment from conversation...');
            
            // Extract customer information from conversation
            const customerInfo = this.extractCustomerInfoFromConversation(conversationHistory, phoneNumber);
            console.log('👤 Customer info extracted:', customerInfo);
            
            // Extract appointment details from AI action or conversation
            const appointmentDetails = this.extractAppointmentDetailsImproved(conversationHistory, currentMessage, aiResponse);
            console.log('📋 Appointment details extracted:', appointmentDetails);
            
            // Create appointment object
            const appointment = {
                id: Date.now().toString(),
                customer_name: customerInfo.name || 'Customer',
                customer_phone: phoneNumber,
                vehicle_info: customerInfo.vehicle || 'Vehicle TBD',
                service_type: customerInfo.service || 'General Service',
                date: appointmentDetails.date,
                time: appointmentDetails.time,
                duration: 1, // Default 1 hour
                status: 'scheduled',
                notes: `Auto-booked from SMS conversation`,
                created_at: new Date().toISOString()
            };
            
            // Store appointment
            this.appointments.push(appointment);
            console.log('✅ Appointment stored in memory');
            
            // Update customer record
            this.updateCustomerRecord(phoneNumber, customerInfo.name, customerInfo.vehicle, customerInfo.service);
            
            return appointment;
        } catch (error) {
            console.error('❌ Error creating appointment:', error);
            return null;
        }
    }

    /**
     * IMPROVED appointment details extraction
     */
    extractAppointmentDetailsImproved(conversationHistory, currentMessage, aiResponse) {
        // First check if AI action has BOOKING_CONFIRMED format
        if (aiResponse.action && aiResponse.action.includes('BOOKING_CONFIRMED:')) {
            const parts = aiResponse.action.split('|').map(p => p.trim());
            if (parts.length >= 6) {
                const dateStr = parts[4].trim();
                const timeStr = parts[5].trim();
                
                console.log(`📋 Extracted from AI action - Date: ${dateStr}, Time: ${timeStr}`);
                
                return {
                    date: this.parseBookingDate(dateStr),
                    time: this.parseBookingTime(timeStr)
                };
            }
        }
        
        // Fallback to analyzing all conversation text
        const allText = [
            ...conversationHistory.slice(-10).map(msg => msg.body),
            currentMessage,
            aiResponse.reply
        ].join(' ').toLowerCase();
        
        console.log('🔍 Analyzing text for appointment details...');
        
        let date = this.parseBookingDate(allText);
        let time = this.parseBookingTime(allText);
        
        console.log(`📅 Final parsed - Date: ${date}, Time: ${time}`);
        
        return { date, time };
    }

    /**
     * Generates a tech sheet from an appointment
     */
    generateTechSheetFromAppointment(appointment) {
        try {
            const techSheet = {
                id: Date.now().toString() + '_tech',
                title: `${appointment.service_type} - ${appointment.vehicle_info}`,
                description: `${appointment.service_type} for ${appointment.vehicle_info}`,
                vehicle_info: appointment.vehicle_info,
                customer_name: appointment.customer_name,
                estimated_time: 1.5,
                difficulty: 'Medium',
                tools_required: this.getToolsForService(appointment.service_type),
                parts_needed: this.getPartsForService(appointment.service_type),
                safety_warnings: this.getSafetyWarningsForService(appointment.service_type),
                step_by_step: this.getStepsForService(appointment.service_type),
                tips: this.getTipsForService(appointment.service_type),
                created_at: new Date().toISOString(),
                generated_by: 'manual',
                source: 'booking',
                quote_id: appointment.id
            };
            
            this.techSheets.push(techSheet);
            console.log('✅ Tech sheet generated and stored');
            return techSheet;
        } catch (error) {
            console.error('❌ Error generating tech sheet:', error);
            return null;
        }
    }

    /**
     * Helper methods for tech sheet generation
     */
    getToolsForService(service) {
        const serviceType = service.toLowerCase();
        if (serviceType.includes('oil')) return ['Oil drain pan', 'Socket wrench', 'Oil filter wrench', 'Funnel'];
        if (serviceType.includes('brake')) return ['Brake tools', 'C-clamp', 'Socket set', 'Torque wrench'];
        if (serviceType.includes('tire')) return ['Tire iron', 'Jack', 'Jack stands', 'Torque wrench'];
        return ['Basic hand tools', 'Socket set', 'Wrench set'];
    }

    getPartsForService(service) {
        const serviceType = service.toLowerCase();
        if (serviceType.includes('oil')) return ['Engine oil', 'Oil filter', 'Drain plug gasket'];
        if (serviceType.includes('brake')) return ['Brake pads', 'Brake fluid', 'Hardware kit'];
        if (serviceType.includes('tire')) return ['Tires', 'Valve stems', 'Wheel weights'];
        return ['As specified in service request'];
    }

    getSafetyWarningsForService(service) {
        const serviceType = service.toLowerCase();
        if (serviceType.includes('oil')) return ['Engine may be hot', 'Dispose of oil properly', 'Wear gloves'];
        if (serviceType.includes('brake')) return ['Never work under vehicle without proper support', 'Brake fluid is corrosive', 'Test brakes before driving'];
        if (serviceType.includes('tire')) return ['Never work under vehicle supported only by jack', 'Check tire pressure when cold', 'Inspect for damage'];
        return ['Wear safety glasses', 'Use proper lifting techniques', 'Ensure vehicle is secure'];
    }

    getStepsForService(service) {
        const serviceType = service.toLowerCase();
        if (serviceType.includes('oil')) return [
            'Warm engine to operating temperature',
            'Lift vehicle and locate drain plug',
            'Drain old oil completely',
            'Replace oil filter',
            'Install new drain plug with gasket',
            'Lower vehicle and add new oil',
            'Check oil level and for leaks'
        ];
        if (serviceType.includes('brake')) return [
            'Lift vehicle and remove wheels',
            'Inspect brake system components',
            'Remove old brake pads',
            'Clean and lubricate caliper slides',
            'Install new brake pads',
            'Bleed brake system if needed',
            'Test brake pedal feel and function'
        ];
        return [
            'Assess the vehicle and confirm the issue',
            'Gather all required tools and parts',
            'Follow manufacturer specifications',
            'Perform the repair work carefully',
            'Test functionality after completion',
            'Clean up work area and dispose of waste properly'
        ];
    }

    getTipsForService(service) {
        const serviceType = service.toLowerCase();
        if (serviceType.includes('oil')) return ['Use correct oil viscosity', 'Reset oil life monitor', 'Keep maintenance records'];
        if (serviceType.includes('brake')) return ['Always replace pads in pairs', 'Check rotor condition', 'Pump brakes before driving'];
        if (serviceType.includes('tire')) return ['Rotate tires regularly', 'Check alignment if wear is uneven', 'Keep spare tire inflated'];
        return ['Take photos before disassembly', 'Keep parts organized', 'Refer to service manual'];
    }

    /**
     * IMPROVED customer info extraction
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
            
            // Look for vehicle patterns - IMPROVED
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
            
            // Look for service patterns - IMPROVED
            if (!service) {
                const services = ['oil change', 'brake service', 'brake repair', 'tire service', 'transmission', 'engine repair', 'battery replacement', 'tune up', 'inspection', 'diagnostic'];
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
     * IMPROVED date parsing
     */
    parseBookingDate(text) {
        const today = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const lowerText = text.toLowerCase();
        
        console.log('📅 Parsing date from text...');
        
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
                
                console.log(`📅 Calculated appointment date: ${dateStr}`);
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
     * IMPROVED time parsing
     */
    parseBookingTime(text) {
        const lowerText = text.toLowerCase();
        
        console.log('🕐 Parsing time from text...');
        
        // Look for specific time mentions first
        if (lowerText.includes('10am') || lowerText.includes('10 am')) {
            console.log('🕐 Found 10am mention');
            return '10:00';
        }
        if (lowerText.includes('10pm') || lowerText.includes('10 pm')) {
            console.log('🕐 Found 10pm mention');
            return '22:00';
        }
        if (lowerText.includes('9am') || lowerText.includes('9 am')) {
            return '09:00';
        }
        if (lowerText.includes('11am') || lowerText.includes('11 am')) {
            return '11:00';
        }
        if (lowerText.includes('2pm') || lowerText.includes('2 pm')) {
            return '14:00';
        }
        if (lowerText.includes('3pm') || lowerText.includes('3 pm')) {
            return '15:00';
        }
        
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
            }
            
            // Format as HH:MM
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            console.log(`🕐 Formatted time: ${timeStr}`);
            return timeStr;
        }
        
        // Default to 10:00 AM if we can't parse
        console.log('🕐 Using default time: 10:00');
        return '10:00';
    }

    /**
     * Gets conversation history for a specific phone number
     */
    getConversationHistory(phoneNumber, limit = 30) {
        return this.messages
            .filter(msg => msg.phone_number === phoneNumber)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-limit);
    }

    /**
     * Updates customer record with new information
     */
    updateCustomerRecord(phoneNumber, customerName, vehicle, service) {
        try {
            let customer = this.customers.find(c => c.phone_number === phoneNumber);
            
            if (!customer) {
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
            
            if (customerName && customerName !== 'Customer') {
                customer.full_name = customerName;
            }
            
            if (vehicle && vehicle !== 'Vehicle TBD' && !customer.vehicles.some(v => v.details === vehicle)) {
                customer.vehicles.push({
                    details: vehicle,
                    added_at: new Date().toISOString()
                });
                console.log('🚗 Vehicle added to customer:', vehicle);
            }
            
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
            console.log(`📤 Sending response to ${phoneNumber}`);

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
            return process.env.DND_ENABLED === 'true';
        }
        catch {
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
        }
        catch (error) {
            console.error('❌ Error sending manual reply:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const messageProcessor = new MessageProcessor();