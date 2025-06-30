import axios from 'axios';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAIService {
    apiKey;

    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Processes a message with full conversation context and customer data collection
     * Enhanced to be less aggressive and more natural in conversation
     */
    async processMessageWithContext(messageBody, conversationHistory, businessName = 'Pink Chicken Speed Shop') {
        try {
            // Analyze what customer information we already have
            const customerInfo = this.extractCustomerInfo(conversationHistory, messageBody);
            
            // Build conversation context for AI - INCREASED HISTORY LENGTH
            const messages = [
                {
                    role: 'system',
                    content: `You are a professional, friendly assistant for ${businessName}, an automotive repair shop. 

CONVERSATION STYLE:
- Be natural and conversational, not pushy or aggressive
- Don't ask for information one thing at a time like a form
- Take whatever information the customer gives you naturally
- Don't push for address unless absolutely necessary for service
- Focus on helping them with their actual need first
- Collect info organically during natural conversation

CUSTOMER DATA COLLECTION (when natural):
If you need customer info, ask for what's most relevant:
1. Name (only if needed for booking/service)
2. Vehicle details (year, make, model - only what they provide)
3. Contact info (only if booking an appointment)
4. Service needed (focus on this first)

APPOINTMENT BOOKING:
When customers want to schedule service:
- Suggest specific days and times (Monday-Friday, 8am-5pm)
- Confirm their preferred date and time
- Get essential info: name, vehicle, service needed
- Use this EXACT format when booking is confirmed:
  "BOOKING_CONFIRMED: [Customer Name] | [Phone] | [Vehicle] | [Service] | [Date] | [Time]"

CUSTOMER INFO STATUS:
${this.formatCustomerInfoStatus(customerInfo)}

CONVERSATION RULES:
- Use the conversation history to provide contextual responses
- If customer says "yes" or agrees, refer to what they're agreeing to based on context
- Be helpful and focus on their actual automotive needs
- Don't interrogate them - have a natural conversation
- Your labor rate is $80/hr with a 1-hour minimum ($20 per 15 min extra)

RESPONSE FORMAT:
Reply: [The natural, helpful message that addresses their need]
Intent: [e.g. Quote Request, Booking Confirmation, Service Inquiry, Emergency]
Action: [e.g. Provide quote, Schedule appointment, Ask for vehicle details]
CustomerData: [JSON object with any new customer data collected naturally]`
                }
            ];

            // Add conversation history for context - INCREASED FROM 10 TO 30 MESSAGES
            if (conversationHistory && conversationHistory.length > 0) {
                // Take the last 30 messages instead of 10 for better context
                const recentHistory = conversationHistory.slice(-30);
                
                messages.push({
                    role: 'user',
                    content: `CONVERSATION HISTORY (last ${recentHistory.length} messages, most recent last):
${recentHistory.map(msg => 
    `${msg.direction === 'inbound' ? 'CUSTOMER' : 'YOU'}: "${msg.body}"`
).join('\n')}

CURRENT MESSAGE FROM CUSTOMER: "${messageBody}"

Based on this conversation, provide a natural, helpful response that:
1. Addresses their current message appropriately
2. Focuses on their automotive service needs
3. Moves the conversation forward naturally
4. If they want to book an appointment, confirm details and use BOOKING_CONFIRMED format`
                });
            } else {
                // New conversation - start naturally
                messages.push({
                    role: 'user',
                    content: `NEW CUSTOMER MESSAGE: "${messageBody}"

This is a new conversation. Provide a professional, natural response that:
1. Addresses their automotive inquiry helpfully
2. Focuses on their service needs first
3. Only asks for essential info if needed for their specific request`
                });
            }

            console.log(`🧠 Sending ${conversationHistory.length} messages of context to AI (using last 30)`);

            const response = await axios.post(OPENAI_API_URL, {
                model: 'gpt-4o',
                temperature: 0.6,
                max_tokens: 600,
                messages
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            const fullResponse = response.data?.choices?.[0]?.message?.content || '';
            return this.parseAIResponse(fullResponse);
        }
        catch (error) {
            console.error('OpenAI API Error:', error.response?.status, error.response?.data);
            
            // Handle specific error cases and provide fallback responses
            if (error.response?.status === 429) {
                console.log('⚠️  Rate limit/No credits - using intelligent fallback');
                return this.getIntelligentFallback(messageBody, conversationHistory);
            }
            
            if (error.response?.status === 401) {
                console.log('⚠️  Invalid API key - using fallback response');
                return this.getIntelligentFallback(messageBody, conversationHistory);
            }
            
            if (error.response?.status >= 400) {
                console.log('⚠️  API error - using fallback response');
                return this.getIntelligentFallback(messageBody, conversationHistory);
            }
            
            // Network or other errors
            console.log('⚠️  Network/timeout error - using fallback response');
            return this.getIntelligentFallback(messageBody, conversationHistory);
        }
    }

    /**
     * Extracts customer information from conversation history and current message
     */
    extractCustomerInfo(conversationHistory, currentMessage) {
        const info = {
            firstName: null,
            lastName: null,
            fullName: null,
            isRepeatCustomer: null,
            address: null,
            vehicle: {
                year: null,
                make: null,
                model: null,
                details: null
            },
            serviceNeeded: null,
            hasContactInfo: false
        };

        // Combine all messages to analyze - INCREASED ANALYSIS SCOPE
        const allMessages = [
            ...conversationHistory.slice(-30).map(msg => msg.body), // Analyze last 30 messages
            currentMessage
        ].join(' ').toLowerCase();

        // Extract vehicle information
        const vehiclePatterns = [
            /(\d{4})\s+(ford|chevy|chevrolet|dodge|toyota|honda|nissan|bmw|mercedes|audi|volkswagen|vw|subaru|mazda|hyundai|kia|jeep|ram|gmc|cadillac|buick|lincoln|acura|infiniti|lexus|volvo|porsche|ferrari|lamborghini|maserati|bentley|rolls.royce)\s+(\w+)/gi,
            /(ford|chevy|chevrolet|dodge|toyota|honda|nissan|bmw|mercedes|audi|volkswagen|vw|subaru|mazda|hyundai|kia|jeep|ram|gmc|cadillac|buick|lincoln|acura|infiniti|lexus|volvo|porsche|ferrari|lamborghini|maserati|bentley|rolls.royce)\s+(\w+)/gi
        ];

        vehiclePatterns.forEach(pattern => {
            const matches = allMessages.match(pattern);
            if (matches) {
                const match = matches[0];
                const parts = match.split(' ');
                if (parts.length >= 3 && /^\d{4}$/.test(parts[0])) {
                    info.vehicle.year = parts[0];
                    info.vehicle.make = parts[1];
                    info.vehicle.model = parts[2];
                } else if (parts.length >= 2) {
                    info.vehicle.make = parts[0];
                    info.vehicle.model = parts[1];
                }
                info.vehicle.details = match;
            }
        });

        // Extract service information
        const serviceKeywords = [
            'oil change', 'brake', 'tire', 'transmission', 'engine', 'battery',
            'alternator', 'starter', 'radiator', 'coolant', 'tune up', 'inspection',
            'diagnostic', 'repair', 'maintenance', 'service', 'check', 'replace',
            'tie rod', 'ball joint', 'strut', 'shock', 'muffler', 'exhaust',
            'timing belt', 'water pump', 'fuel pump', 'spark plug', 'air filter'
        ];

        serviceKeywords.forEach(keyword => {
            if (allMessages.includes(keyword)) {
                info.serviceNeeded = keyword;
            }
        });

        // Check for name patterns
        const namePatterns = [
            /my name is (\w+)(?:\s+(\w+))?/gi,
            /i'm (\w+)(?:\s+(\w+))?/gi,
            /this is (\w+)(?:\s+(\w+))?/gi,
            /call me (\w+)/gi
        ];

        namePatterns.forEach(pattern => {
            const match = allMessages.match(pattern);
            if (match) {
                const parts = match[0].split(' ');
                if (parts.length >= 3) {
                    info.firstName = parts[parts.length - 2];
                    info.lastName = parts[parts.length - 1];
                    info.fullName = `${info.firstName} ${info.lastName}`;
                } else {
                    info.firstName = parts[parts.length - 1];
                    info.fullName = info.firstName;
                }
            }
        });

        // Check for repeat customer indicators
        const repeatIndicators = ['been here before', 'returning customer', 'came here before', 'previous customer'];
        const newIndicators = ['first time', 'never been', 'new customer', 'haven\'t been'];
        
        repeatIndicators.forEach(indicator => {
            if (allMessages.includes(indicator)) {
                info.isRepeatCustomer = true;
            }
        });

        newIndicators.forEach(indicator => {
            if (allMessages.includes(indicator)) {
                info.isRepeatCustomer = false;
            }
        });

        return info;
    }

    /**
     * Formats customer information status for AI context
     */
    formatCustomerInfoStatus(info) {
        const status = [];
        
        if (info.fullName) {
            status.push(`✅ Name: ${info.fullName}`);
        } else {
            status.push(`❓ Name: Not provided (ask only if booking appointment)`);
        }

        if (info.vehicle.details) {
            status.push(`✅ Vehicle: ${info.vehicle.details}`);
        } else {
            status.push(`❓ Vehicle: Not specified (ask only if relevant to service)`);
        }

        if (info.serviceNeeded) {
            status.push(`✅ Service: ${info.serviceNeeded}`);
        } else {
            status.push(`❓ Service: Not specified (focus on understanding their need)`);
        }

        return status.join('\n');
    }

    /**
     * Legacy method for backward compatibility
     */
    async processMessage(messageBody, businessName = 'Pink Chicken Speed Shop') {
        return this.processMessageWithContext(messageBody, [], businessName);
    }

    getIntelligentFallback(messageBody, conversationHistory = []) {
        // Enhanced fallback logic with natural conversation and booking
        const lowerMessage = messageBody.toLowerCase();
        const customerInfo = this.extractCustomerInfo(conversationHistory, messageBody);

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
                        reply: `Perfect! I'll get that scheduled for you. Thanks for choosing Pink Chicken Speed Shop!`,
                        intent: "Booking Confirmation",
                        action: `BOOKING_CONFIRMED: ${customerInfo.fullName || 'Customer'} | ${customerInfo.phoneNumber || 'Phone needed'} | ${customerInfo.vehicle.details || 'Vehicle TBD'} | ${customerInfo.serviceNeeded || 'Service TBD'} | Next available | 10:00`,
                        customerData: customerInfo
                    };
                }

                if (lastOutboundMessage.body.toLowerCase().includes('quote') ||
                    lastOutboundMessage.body.toLowerCase().includes('estimate')) {
                    return {
                        reply: "Great! I'll prepare that quote for you and get back to you with the details shortly. Thanks for your business!",
                        intent: "Quote Confirmation",
                        action: "Prepare and send detailed quote",
                        customerData: customerInfo
                    };
                }

                // Generic positive response
                return {
                    reply: "Excellent! I'll take care of that for you right away. I'll be in touch with the next steps. Thanks for choosing us!",
                    intent: "Confirmation",
                    action: "Follow up with confirmed service",
                    customerData: customerInfo
                };
            }
        }

        // Check for booking/appointment requests with specific day/time
        if (lowerMessage.includes('appointment') ||
            lowerMessage.includes('schedule') ||
            lowerMessage.includes('book') ||
            lowerMessage.includes('available') ||
            lowerMessage.includes('when can') ||
            lowerMessage.includes('thursday') ||
            lowerMessage.includes('monday') ||
            lowerMessage.includes('tuesday') ||
            lowerMessage.includes('wednesday') ||
            lowerMessage.includes('friday')) {
            
            // Check if they mentioned a specific day/time
            const timeMatch = lowerMessage.match(/(monday|tuesday|wednesday|thursday|friday).*?(\d{1,2}(?:am|pm|:\d{2}(?:am|pm)?)?)/i);
            if (timeMatch) {
                const day = timeMatch[1];
                const time = timeMatch[2];
                return {
                    reply: `Perfect! I can schedule you for ${day} at ${time}. I'll confirm the details and see you then!`,
                    intent: "Booking Confirmation",
                    action: `BOOKING_CONFIRMED: ${customerInfo.fullName || 'Customer'} | Phone needed | ${customerInfo.vehicle.details || 'Vehicle TBD'} | ${customerInfo.serviceNeeded || 'Service TBD'} | ${day} | ${time}`,
                    customerData: customerInfo
                };
            }
            
            return {
                reply: `I'd be happy to schedule an appointment for you! We're open Monday-Friday, 8am-5pm. What day and time works best for you?`,
                intent: "Booking Request",
                action: "Collect preferred appointment time",
                customerData: customerInfo
            };
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
                customerData: customerInfo
            };
        }

        // Service/maintenance requests
        if (lowerMessage.includes('oil change') ||
            lowerMessage.includes('service') ||
            lowerMessage.includes('maintenance') ||
            lowerMessage.includes('tune up') ||
            lowerMessage.includes('inspection')) {
            
            return {
                reply: `Hi! Thanks for reaching out about service. I'd be happy to help with your vehicle maintenance. My rate is $80/hr with a 1-hour minimum. What vehicle are you bringing in and what service do you need?`,
                intent: "Service Request",
                action: "Collect vehicle and service details",
                customerData: customerInfo
            };
        }

        // Quote requests
        if (lowerMessage.includes('quote') ||
            lowerMessage.includes('price') ||
            lowerMessage.includes('cost') ||
            lowerMessage.includes('estimate') ||
            lowerMessage.includes('how much')) {
            
            return {
                reply: `Thanks for your quote request! I'd be happy to provide an estimate. My labor rate is $80/hr with a 1-hour minimum. What vehicle and what service are you looking to get done?`,
                intent: "Quote Request",
                action: "Collect vehicle and service details for quote",
                customerData: customerInfo
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
                reply: `I can help you with that issue. My diagnostic rate is $80/hr. Can you tell me what vehicle you have and describe what's happening?`,
                intent: "Repair Request",
                action: "Diagnose issue and provide solution",
                customerData: customerInfo
            };
        }

        // Default response for any other message
        return {
            reply: `Hi! Thanks for your message. I'm Pink Chicken Speed Shop and I'd be happy to help with your automotive needs. My rate is $80/hr. What can I help you with today?`,
            intent: "General Inquiry",
            action: "Understand customer need",
            customerData: customerInfo
        };
    }

    parseAIResponse(fullResponse) {
        const lines = fullResponse.split('\n');
        
        // Extract Reply line
        const replyLine = lines.find(line => line.toLowerCase().startsWith('reply:'));
        const reply = replyLine ? replyLine.replace(/^reply:\s*/i, '').trim() : fullResponse;
        
        // Extract Intent line
        const intentLine = lines.find(line => line.toLowerCase().startsWith('intent:'));
        const intent = intentLine ? intentLine.replace(/^intent:\s*/i, '').trim() : 'General Inquiry';
        
        // Extract Action line
        const actionLine = lines.find(line => line.toLowerCase().startsWith('action:'));
        const action = actionLine ? actionLine.replace(/^action:\s*/i, '').trim() : 'Reply sent';

        // Extract CustomerData line (new)
        const customerDataLine = lines.find(line => line.toLowerCase().startsWith('customerdata:'));
        let customerData = {};
        if (customerDataLine) {
            try {
                const dataStr = customerDataLine.replace(/^customerdata:\s*/i, '').trim();
                customerData = JSON.parse(dataStr);
            } catch (e) {
                console.warn('Could not parse customer data from AI response');
            }
        }

        return { reply, intent, action, customerData };
    }
}