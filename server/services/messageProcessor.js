import { OpenAIService } from './openai.js';
import { OpenPhoneService } from './openphone.js';

// Simple in-memory storage for messages (in production, use a database)
let messageStore = []

// Customer database storage (in production, use a proper database)
let customerDatabase = []

// Quotes database storage
let quotesDatabase = []

// Appointments database storage
let appointmentsDatabase = []

// Tech sheets database storage
let techSheetsDatabase = []

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

            // Load existing databases
            this.loadDatabases();

            console.log('🤖 MessageProcessor initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize MessageProcessor:', error);
        }
    }

    /**
     * Loads all databases from storage (in production, this would be a real database)
     */
    loadDatabases() {
        try {
            // In production, this would load from a database
            console.log('📊 All databases loaded');
        } catch (error) {
            console.error('❌ Error loading databases:', error);
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
     * 🎯 ENHANCED: Creates a quote when AI provides pricing information
     * FIXED: Better price detection and quote creation logic
     */
    createQuoteFromAI(phoneNumber, aiResponse, customer, conversationHistory = []) {
        try {
            console.log('💰 Analyzing AI response for quote creation...');
            console.log(`   AI Reply: "${aiResponse.reply}"`);
            console.log(`   AI Intent: "${aiResponse.intent}"`);
            console.log(`   AI Action: "${aiResponse.action}"`);

            // ENHANCED: Multiple ways to detect pricing
            const pricePatterns = [
                /\$(\d+(?:\.\d{2})?)/g,                    // $120, $120.00
                /(\d+)\s*dollars?/gi,                      // 120 dollars
                /around\s*\$?(\d+)/gi,                     // around $120
                /about\s*\$?(\d+)/gi,                      // about $120
                /estimate.*\$?(\d+)/gi,                    // estimate $120
                /total.*\$?(\d+)/gi,                       // total $120
                /cost.*\$?(\d+)/gi,                        // cost $120
                /price.*\$?(\d+)/gi                        // price $120
            ];

            let totalCost = null;
            let priceText = '';

            // Try each pattern to find pricing
            for (const pattern of pricePatterns) {
                const matches = aiResponse.reply.match(pattern);
                if (matches) {
                    // Extract the number from the match
                    const numberMatch = matches[0].match(/(\d+(?:\.\d{2})?)/);
                    if (numberMatch) {
                        totalCost = parseFloat(numberMatch[1]);
                        priceText = matches[0];
                        console.log(`💰 Found price: ${priceText} = $${totalCost}`);
                        break;
                    }
                }
            }

            if (!totalCost || totalCost < 10) {
                console.log('💰 No valid price found in AI response (minimum $10), skipping quote creation');
                return null;
            }

            // Extract labor hours from AI response or conversation
            const laborHoursPatterns = [
                /(\d+(?:\.\d+)?)\s*hours?/gi,
                /(\d+(?:\.\d+)?)\s*hrs?/gi,
                /(\d+(?:\.\d+)?)\s*hour/gi
            ];

            let laborHours = 1; // Default minimum
            for (const pattern of laborHoursPatterns) {
                const match = aiResponse.reply.match(pattern);
                if (match) {
                    laborHours = parseFloat(match[1]);
                    console.log(`⏰ Found labor hours: ${laborHours}`);
                    break;
                }
            }

            // Calculate costs
            const laborCost = laborHours * this.settings.labor_rate;
            const partsCost = Math.max(0, totalCost - laborCost);

            // Extract service description from conversation and AI response
            const serviceDescription = this.extractServiceDescription(aiResponse, conversationHistory);

            // Get vehicle info from customer record or conversation
            const vehicleInfo = customer?.vehicles[0]?.details || 
                               this.extractVehicleFromConversation(conversationHistory) || 
                               'Vehicle';

            const quote = {
                id: Date.now().toString(),
                customer_name: customer?.full_name || 'Customer',
                customer_phone: phoneNumber,
                vehicle_info: vehicleInfo,
                description: serviceDescription,
                labor_hours: laborHours,
                labor_rate: this.settings.labor_rate,
                parts_cost: partsCost,
                total_cost: totalCost,
                status: 'sent',
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            };

            quotesDatabase.push(quote);
            console.log('💰 ✅ QUOTE CREATED SUCCESSFULLY:', {
                id: quote.id,
                customer: quote.customer_name,
                vehicle: quote.vehicle_info,
                service: quote.description,
                total: `$${quote.total_cost}`,
                laborHours: quote.labor_hours,
                partsCost: `$${quote.parts_cost}`
            });

            return quote;
        } catch (error) {
            console.error('❌ Error creating quote:', error);
            return null;
        }
    }

    /**
     * 🎯 ENHANCED: Books an appointment when customer confirms scheduling
     * FIXED: Better scheduling detection and appointment creation
     */
    bookAppointmentFromAI(phoneNumber, aiResponse, customer, conversationHistory = []) {
        try {
            console.log('📅 Analyzing conversation for appointment booking...');
            console.log(`   AI Reply: "${aiResponse.reply}"`);
            console.log(`   AI Intent: "${aiResponse.intent}"`);
            console.log(`   AI Action: "${aiResponse.action}"`);

            // Extract date/time information from entire conversation
            const dateTimeInfo = this.extractDateTimeFromConversation(phoneNumber, conversationHistory);
            console.log('📅 Extracted date/time info:', dateTimeInfo);

            // Get service description and vehicle info
            const serviceDescription = this.extractServiceDescription(aiResponse, conversationHistory);
            const vehicleInfo = customer?.vehicles[0]?.details || 
                               this.extractVehicleFromConversation(conversationHistory) || 
                               'Vehicle';

            // Determine duration based on service type
            let duration = 2; // Default 2 hours
            if (serviceDescription.toLowerCase().includes('oil change')) duration = 1;
            if (serviceDescription.toLowerCase().includes('brake')) duration = 2;
            if (serviceDescription.toLowerCase().includes('tie rod')) duration = 1.5;
            if (serviceDescription.toLowerCase().includes('diagnostic')) duration = 1;

            const appointment = {
                id: Date.now().toString(),
                customer_name: customer?.full_name || 'Customer',
                customer_phone: phoneNumber,
                vehicle_info: vehicleInfo,
                service_type: serviceDescription,
                date: dateTimeInfo.date,
                time: dateTimeInfo.time,
                duration: duration,
                status: 'scheduled',
                notes: `Auto-booked from SMS conversation`,
                created_at: new Date().toISOString()
            };

            appointmentsDatabase.push(appointment);
            console.log('📅 ✅ APPOINTMENT BOOKED SUCCESSFULLY:', {
                id: appointment.id,
                customer: appointment.customer_name,
                vehicle: appointment.vehicle_info,
                service: appointment.service_type,
                date: appointment.date,
                time: appointment.time,
                duration: `${appointment.duration} hours`
            });

            return appointment;
        } catch (error) {
            console.error('❌ Error booking appointment:', error);
            return null;
        }
    }

    /**
     * 🎯 ENHANCED: Execute actions based on AI response with better detection
     * FIXED: More aggressive action detection and execution
     */
    async executeAIActions(phoneNumber, aiResponse, customer, conversationHistory = []) {
        try {
            console.log('🎯 ===== EXECUTING AI ACTIONS =====');
            console.log(`📱 Phone: ${phoneNumber}`);
            console.log(`🤖 AI Reply: "${aiResponse.reply}"`);
            console.log(`🎯 AI Intent: "${aiResponse.intent}"`);
            console.log(`📋 AI Action: "${aiResponse.action}"`);
            console.log('=====================================');

            let actionsExecuted = [];

            // 1. 💰 CREATE QUOTE - Enhanced detection
            const shouldCreateQuote = 
                aiResponse.reply.includes('$') ||                                    // Contains price
                aiResponse.intent.toLowerCase().includes('quote') ||                 // Intent mentions quote
                aiResponse.action.toLowerCase().includes('quote') ||                 // Action mentions quote
                aiResponse.reply.toLowerCase().includes('estimate') ||               // Contains estimate
                aiResponse.reply.toLowerCase().includes('cost') ||                   // Contains cost
                aiResponse.reply.toLowerCase().includes('price') ||                  // Contains price
                aiResponse.reply.toLowerCase().includes('total') ||                  // Contains total
                (aiResponse.reply.toLowerCase().includes('hour') && 
                 aiResponse.reply.toLowerCase().includes('80'));                     // Contains hour rate

            if (shouldCreateQuote) {
                console.log('💰 QUOTE CREATION TRIGGERED');
                const quote = this.createQuoteFromAI(phoneNumber, aiResponse, customer, conversationHistory);
                if (quote) {
                    actionsExecuted.push(`Quote #${quote.id} created for $${quote.total_cost}`);
                }
            }

            // 2. 📅 BOOK APPOINTMENT - Enhanced detection
            const shouldBookAppointment = 
                aiResponse.intent.toLowerCase().includes('booking') ||               // Intent mentions booking
                aiResponse.intent.toLowerCase().includes('appointment') ||           // Intent mentions appointment
                aiResponse.intent.toLowerCase().includes('schedule') ||              // Intent mentions schedule
                aiResponse.action.toLowerCase().includes('schedule') ||              // Action mentions schedule
                aiResponse.action.toLowerCase().includes('appointment') ||           // Action mentions appointment
                aiResponse.reply.toLowerCase().includes('scheduled') ||              // Reply mentions scheduled
                aiResponse.reply.toLowerCase().includes('appointment') ||            // Reply mentions appointment
                this.hasSchedulingContext(conversationHistory);                     // Conversation has scheduling context

            if (shouldBookAppointment) {
                console.log('📅 APPOINTMENT BOOKING TRIGGERED');
                const appointment = this.bookAppointmentFromAI(phoneNumber, aiResponse, customer, conversationHistory);
                if (appointment) {
                    actionsExecuted.push(`Appointment booked for ${appointment.date} at ${appointment.time}`);
                    
                    // 🔧 AUTO-GENERATE TECH SHEET for appointment
                    console.log('🔧 AUTO-GENERATING TECH SHEET for appointment...');
                    const techSheet = await this.generateTechSheetFromService(appointment);
                    if (techSheet) {
                        actionsExecuted.push(`Tech sheet "${techSheet.title}" generated`);
                    }
                }
            }

            // 3. ✅ ACCEPT QUOTE - When customer says yes to a recent quote
            const shouldAcceptQuote = 
                (aiResponse.intent.toLowerCase().includes('confirmation') ||         // Intent is confirmation
                 aiResponse.intent.toLowerCase().includes('accept') ||               // Intent is accept
                 this.isPositiveResponse(aiResponse.reply)) &&                      // Reply is positive
                this.hasRecentQuote(phoneNumber);                                   // Has recent quote

            if (shouldAcceptQuote) {
                console.log('✅ QUOTE ACCEPTANCE TRIGGERED');
                const recentQuote = this.getRecentQuote(phoneNumber);
                if (recentQuote) {
                    // Update quote status to accepted
                    recentQuote.status = 'accepted';
                    console.log('✅ QUOTE ACCEPTED:', `Quote #${recentQuote.id}`);
                    actionsExecuted.push(`Quote #${recentQuote.id} accepted`);
                    
                    // 🔧 Generate tech sheet for accepted quote
                    console.log('🔧 GENERATING TECH SHEET for accepted quote...');
                    const techSheet = await this.generateTechSheetFromQuote(recentQuote);
                    if (techSheet) {
                        actionsExecuted.push(`Tech sheet "${techSheet.title}" generated for accepted quote`);
                    }
                    
                    // 📅 Book appointment for the accepted quote if scheduling context exists
                    if (this.hasSchedulingContext(conversationHistory)) {
                        console.log('📅 BOOKING APPOINTMENT for accepted quote...');
                        const appointment = this.bookAppointmentFromAI(phoneNumber, aiResponse, customer, conversationHistory);
                        if (appointment) {
                            appointment.quote_id = recentQuote.id;
                            actionsExecuted.push(`Appointment booked for accepted quote`);
                        }
                    }
                }
            }

            // 4. 🔧 STANDALONE TECH SHEET - When service is described in detail
            const shouldCreateTechSheet = 
                !shouldBookAppointment &&                                           // Not already creating from appointment
                !shouldAcceptQuote &&                                               // Not already creating from quote
                (aiResponse.reply.toLowerCase().includes('repair') ||               // Contains repair
                 aiResponse.reply.toLowerCase().includes('replace') ||              // Contains replace
                 aiResponse.reply.toLowerCase().includes('service') ||              // Contains service
                 aiResponse.reply.toLowerCase().includes('fix') ||                  // Contains fix
                 this.hasDetailedServiceDescription(conversationHistory));          // Has detailed service description

            if (shouldCreateTechSheet) {
                console.log('🔧 STANDALONE TECH SHEET TRIGGERED');
                const serviceDescription = this.extractServiceDescription(aiResponse, conversationHistory);
                const vehicleInfo = customer?.vehicles[0]?.details || 
                                   this.extractVehicleFromConversation(conversationHistory) || 
                                   'Vehicle';
                
                const mockService = {
                    id: Date.now().toString(),
                    description: serviceDescription,
                    vehicle_info: vehicleInfo,
                    customer_name: customer?.full_name || 'Customer',
                    labor_hours: 2
                };
                
                const techSheet = await this.generateTechSheetFromService(mockService);
                if (techSheet) {
                    actionsExecuted.push(`Tech sheet "${techSheet.title}" generated`);
                }
            }

            // Log all executed actions
            if (actionsExecuted.length > 0) {
                console.log('🎯 ✅ ACTIONS EXECUTED SUCCESSFULLY:');
                actionsExecuted.forEach((action, index) => {
                    console.log(`   ${index + 1}. ${action}`);
                });
            } else {
                console.log('🎯 ⚠️ No actions executed - criteria not met');
                console.log('   Criteria checked:');
                console.log(`   - Should create quote: ${shouldCreateQuote}`);
                console.log(`   - Should book appointment: ${shouldBookAppointment}`);
                console.log(`   - Should accept quote: ${shouldAcceptQuote}`);
                console.log(`   - Should create tech sheet: ${shouldCreateTechSheet}`);
            }

        } catch (error) {
            console.error('❌ Error executing AI actions:', error);
        }
    }

    /**
     * Helper methods for enhanced action detection
     */
    isPositiveResponse(reply) {
        const positiveWords = ['yes', 'sure', 'okay', 'ok', 'sounds good', 'that works', 
                              'perfect', 'great', 'excellent', 'please', 'let\'s do it',
                              'go ahead', 'book it', 'schedule it'];
        const lowerReply = reply.toLowerCase();
        return positiveWords.some(word => lowerReply.includes(word));
    }

    hasSchedulingContext(conversationHistory) {
        const schedulingWords = ['thursday', 'wednesday', 'monday', 'tuesday', 'friday',
                                'tomorrow', 'next week', 'schedule', 'appointment', 'book',
                                'available', 'time', 'when can'];
        const conversationText = conversationHistory.map(msg => msg.body).join(' ').toLowerCase();
        return schedulingWords.some(word => conversationText.includes(word));
    }

    hasDetailedServiceDescription(conversationHistory) {
        const serviceWords = ['tie rod', 'brake', 'oil change', 'transmission', 'engine',
                             'repair', 'replace', 'fix', 'service', 'maintenance', 'diagnostic'];
        const conversationText = conversationHistory.map(msg => msg.body).join(' ').toLowerCase();
        return serviceWords.some(word => conversationText.includes(word));
    }

    extractVehicleFromConversation(conversationHistory) {
        const conversationText = conversationHistory.map(msg => msg.body).join(' ');
        
        // Look for vehicle patterns
        const vehiclePatterns = [
            /(\d{4})\s+(ford|chevy|chevrolet|dodge|toyota|honda|nissan|bmw|mercedes|audi|volkswagen|vw|subaru|mazda|hyundai|kia|jeep|ram|gmc|cadillac|buick|lincoln|acura|infiniti|lexus|volvo|porsche|ferrari|lamborghini|maserati|bentley|rolls.royce)\s+(\w+)/gi,
            /(ford|chevy|chevrolet|dodge|toyota|honda|nissan|bmw|mercedes|audi|volkswagen|vw|subaru|mazda|hyundai|kia|jeep|ram|gmc|cadillac|buick|lincoln|acura|infiniti|lexus|volvo|porsche|ferrari|lamborghini|maserati|bentley|rolls.royce)\s+(\w+)/gi
        ];

        for (const pattern of vehiclePatterns) {
            const match = conversationText.match(pattern);
            if (match) {
                return match[0];
            }
        }

        return null;
    }

    /**
     * Enhanced service description extraction
     */
    extractServiceDescription(aiResponse, conversationHistory = []) {
        // Combine AI response and conversation history
        const allText = [
            aiResponse.reply,
            aiResponse.action,
            ...conversationHistory.map(msg => msg.body)
        ].join(' ').toLowerCase();

        // Service type detection with priority
        const serviceTypes = [
            { keywords: ['tie rod'], description: 'Tie rod end replacement' },
            { keywords: ['brake pad', 'brake'], description: 'Brake service' },
            { keywords: ['oil change', 'oil'], description: 'Oil change service' },
            { keywords: ['transmission'], description: 'Transmission service' },
            { keywords: ['engine'], description: 'Engine diagnostic/repair' },
            { keywords: ['battery'], description: 'Battery service' },
            { keywords: ['tire'], description: 'Tire service' },
            { keywords: ['diagnostic'], description: 'Vehicle diagnostic' },
            { keywords: ['tune up', 'tuneup'], description: 'Tune-up service' },
            { keywords: ['inspection'], description: 'Vehicle inspection' },
            { keywords: ['maintenance'], description: 'General maintenance' }
        ];

        for (const serviceType of serviceTypes) {
            if (serviceType.keywords.some(keyword => allText.includes(keyword))) {
                return serviceType.description;
            }
        }

        return 'General automotive service';
    }

    /**
     * Enhanced date/time extraction from conversation
     */
    extractDateTimeFromConversation(phoneNumber, conversationHistory = []) {
        // Look through recent messages for date/time information
        const allMessages = [
            ...messageStore.filter(m => m.phone_number === phoneNumber).slice(0, 10),
            ...conversationHistory
        ];
        
        let date = null;
        let time = null;
        
        for (const msg of allMessages) {
            const dateTime = this.extractDateTimeInfo(msg.body);
            if (dateTime.date && !date) date = dateTime.date;
            if (dateTime.time && !time) time = dateTime.time;
        }
        
        return { 
            date: date || this.getNextBusinessDay(), 
            time: time || '09:00' 
        };
    }

    extractDateTimeInfo(text) {
        const lowerText = text.toLowerCase();
        const result = { date: null, time: null };
        
        // Extract day of week
        if (lowerText.includes('monday')) result.date = this.getNextWeekday(1);
        if (lowerText.includes('tuesday')) result.date = this.getNextWeekday(2);
        if (lowerText.includes('wednesday')) result.date = this.getNextWeekday(3);
        if (lowerText.includes('thursday')) result.date = this.getNextWeekday(4);
        if (lowerText.includes('friday')) result.date = this.getNextWeekday(5);
        if (lowerText.includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            result.date = tomorrow.toISOString().split('T')[0];
        }
        
        // Extract time
        const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const ampm = timeMatch[3].toLowerCase();
            
            if (ampm === 'pm' && hour !== 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;
            
            result.time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
        
        return result;
    }

    getNextWeekday(targetDay) {
        const today = new Date();
        const currentDay = today.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        if (daysUntilTarget <= 0) {
            daysUntilTarget += 7; // Next week
        }
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntilTarget);
        return targetDate.toISOString().split('T')[0];
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

    hasRecentQuote(phoneNumber) {
        return quotesDatabase.some(q => 
            q.customer_phone === phoneNumber && 
            q.status === 'sent' &&
            new Date(q.created_at).getTime() > Date.now() - (24 * 60 * 60 * 1000) // Within 24 hours
        );
    }

    getRecentQuote(phoneNumber) {
        return quotesDatabase
            .filter(q => q.customer_phone === phoneNumber && q.status === 'sent')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }

    /**
     * Generates tech sheet from service/appointment
     */
    async generateTechSheetFromService(serviceData) {
        try {
            if (!this.openAI) {
                console.log('⚠️ OpenAI not available, creating basic tech sheet');
                return this.createBasicTechSheet(serviceData);
            }

            console.log('🔧 Generating tech sheet for service...');

            const prompt = `${serviceData.description} for ${serviceData.vehicle_info}`;
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.openai_api_key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    temperature: 0.7,
                    max_tokens: 1500,
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert automotive technician creating detailed repair guides. Generate a comprehensive tech sheet for the given job description. Format your response as JSON with these exact fields:

{
  "title": "Brief descriptive title",
  "estimated_time": number (hours as decimal),
  "difficulty": "Easy|Medium|Hard",
  "tools_required": ["tool1", "tool2"],
  "parts_needed": ["part1", "part2"],
  "safety_warnings": ["warning1", "warning2"],
  "step_by_step": ["step1", "step2", "step3"],
  "tips": ["tip1", "tip2"]
}

Make the instructions detailed and professional for a working mechanic.`
                        },
                        {
                            role: 'user',
                            content: `Generate a detailed tech sheet for this automotive repair job: ${prompt}`
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '';
            
            let parsedResponse;
            try {
                const cleanResponse = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                parsedResponse = JSON.parse(cleanResponse);
            } catch (parseError) {
                console.warn('Failed to parse AI response, using basic tech sheet');
                return this.createBasicTechSheet(serviceData);
            }

            const techSheet = {
                id: Date.now().toString(),
                title: parsedResponse.title || `${serviceData.description} - ${serviceData.vehicle_info}`,
                description: serviceData.description,
                vehicle_info: serviceData.vehicle_info,
                customer_name: serviceData.customer_name,
                estimated_time: parsedResponse.estimated_time || serviceData.labor_hours || 2,
                difficulty: parsedResponse.difficulty || 'Medium',
                tools_required: Array.isArray(parsedResponse.tools_required) ? parsedResponse.tools_required : ['Basic hand tools'],
                parts_needed: Array.isArray(parsedResponse.parts_needed) ? parsedResponse.parts_needed : ['As specified'],
                safety_warnings: Array.isArray(parsedResponse.safety_warnings) ? parsedResponse.safety_warnings : ['Follow safety procedures'],
                step_by_step: Array.isArray(parsedResponse.step_by_step) ? parsedResponse.step_by_step : ['Follow standard procedures'],
                tips: Array.isArray(parsedResponse.tips) ? parsedResponse.tips : ['Refer to service manual'],
                created_at: new Date().toISOString(),
                generated_by: 'ai',
                source: 'service_request',
                service_id: serviceData.id
            };

            techSheetsDatabase.push(techSheet);
            console.log('🔧 ✅ TECH SHEET GENERATED:', {
                id: techSheet.id,
                title: techSheet.title,
                difficulty: techSheet.difficulty,
                estimatedTime: techSheet.estimated_time
            });

            return techSheet;
        } catch (error) {
            console.error('❌ Error generating tech sheet:', error);
            return this.createBasicTechSheet(serviceData);
        }
    }

    /**
     * Generates tech sheet when quote is accepted
     */
    async generateTechSheetFromQuote(quote) {
        return this.generateTechSheetFromService(quote);
    }

    /**
     * Creates a basic tech sheet when AI generation fails
     */
    createBasicTechSheet(serviceData) {
        const techSheet = {
            id: Date.now().toString(),
            title: `${serviceData.description} - ${serviceData.vehicle_info}`,
            description: serviceData.description,
            vehicle_info: serviceData.vehicle_info,
            customer_name: serviceData.customer_name,
            estimated_time: serviceData.labor_hours || 2,
            difficulty: 'Medium',
            tools_required: ['Basic hand tools', 'Socket set', 'Wrench set'],
            parts_needed: ['As specified in service request'],
            safety_warnings: ['Wear safety glasses', 'Use proper lifting techniques'],
            step_by_step: [
                'Assess the vehicle and confirm the issue',
                'Gather all required tools and parts',
                'Follow manufacturer specifications',
                'Perform the repair work carefully',
                'Test functionality after completion'
            ],
            tips: ['Take photos before disassembly', 'Keep parts organized'],
            created_at: new Date().toISOString(),
            generated_by: 'template',
            source: 'service_request',
            service_id: serviceData.id
        };

        techSheetsDatabase.push(techSheet);
        console.log('🔧 ✅ BASIC TECH SHEET CREATED:', techSheet.title);
        return techSheet;
    }

    /**
     * Gets conversation history from OpenPhone API with improved error handling
     */
    async getConversationHistoryFromOpenPhone(phoneNumber) {
        if (!this.openPhone) {
            console.warn('⚠️ OpenPhone service not available');
            return [];
        }

        try {
            console.log(`📞 Fetching conversation history from OpenPhone for ${phoneNumber}`);
            
            const conversationMessages = await this.openPhone.getConversationHistory(phoneNumber, 10);
            
            console.log(`📚 Retrieved ${conversationMessages.length} messages from OpenPhone for context`);
            
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
                    let customer = null;
                    if (aiResponse.customerData) {
                        customer = this.updateCustomerRecord(phoneNumber, aiResponse.customerData, messageBody);
                    } else {
                        customer = this.getCustomerRecord(phoneNumber);
                    }

                    // 🎯 CRITICAL: Execute actions based on AI response
                    await this.executeAIActions(phoneNumber, aiResponse, customer, conversationHistory);
                }
                catch (aiError) {
                    console.error('❌ AI processing failed, using emergency fallback:', aiError);
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
            console.log('📝 MESSAGE PROCESSING FAILED:');
            console.log(`📱 From: ${phoneNumber}`);
            console.log(`💬 Message: "${messageBody}"`);
            console.log('⚠️  MANUAL RESPONSE REQUIRED');
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

    // Method to get quotes database (for API endpoint)
    getQuotes() {
        return [...quotesDatabase].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    // Method to get appointments database (for API endpoint)
    getAppointments() {
        return [...appointmentsDatabase].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    // Method to get tech sheets database (for API endpoint)
    getTechSheets() {
        return [...techSheetsDatabase].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    /**
     * Gets customer record by phone number
     */
    getCustomerRecord(phoneNumber) {
        return customerDatabase.find(c => c.phone_number === phoneNumber) || null;
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