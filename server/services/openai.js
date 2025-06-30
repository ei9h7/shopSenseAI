import axios from 'axios';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAIService {
    apiKey;

    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Processes a message with full conversation context and customer data collection
     * Enhanced to gather customer information systematically
     */
    async processMessageWithContext(messageBody, conversationHistory, businessName = 'Pink Chicken Speed Shop') {
        try {
            // Analyze what customer information we already have
            const customerInfo = this.extractCustomerInfo(conversationHistory, messageBody);
            
            // Build conversation context for AI
            const messages = [
                {
                    role: 'system',
                    content: `You are a professional, friendly assistant for ${businessName}, an automotive repair shop. 

CUSTOMER DATA COLLECTION PRIORITY:
You must systematically gather customer information in this order:
1. First Name and Last Name (ask naturally: "What's your name?" or "Can I get your name for our records?")
2. Check if they're a repeat customer ("Have you been to our shop before?" or "Are you a returning customer?")
3. If new customer, get their address ("What's your address for our records?")
4. Vehicle details (year, make, model, mileage if relevant)
5. Contact preferences and any special notes

CUSTOMER INFO STATUS:
${this.formatCustomerInfoStatus(customerInfo)}

CONVERSATION RULES:
- Use the conversation history to provide contextual responses
- If customer says "yes" or agrees, refer to what they're agreeing to based on context
- Gather missing customer information naturally during the conversation
- Don't ask for all information at once - spread it across the conversation
- Always acknowledge what they've already provided
- For repeat customers, confirm their existing information instead of re-collecting
- Your labor rate is $80/hr with a 1-hour minimum ($20 per 15 min extra)

RESPONSE FORMAT:
Reply: [The contextual message that naturally collects missing info]
Intent: [e.g. Quote Request, Booking Confirmation, Customer Data Collection, Emergency]
Action: [e.g. Collect customer name, Verify repeat customer, Schedule appointment]
CustomerData: [JSON object with any new customer data collected]`
                }
            ];

            // Add conversation history for context
            if (conversationHistory && conversationHistory.length > 0) {
                messages.push({
                    role: 'user',
                    content: `CONVERSATION HISTORY (most recent last):
${conversationHistory.map(msg => 
    `${msg.direction === 'inbound' ? 'CUSTOMER' : 'YOU'}: "${msg.body}"`
).join('\n')}

CURRENT MESSAGE FROM CUSTOMER: "${messageBody}"

Based on this conversation and the customer information status above, provide a contextual response that:
1. Addresses their current message appropriately
2. Naturally collects any missing customer information
3. Moves the conversation forward toward booking/service`
                });
            } else {
                // New conversation - start with greeting and name collection
                messages.push({
                    role: 'user',
                    content: `NEW CUSTOMER MESSAGE: "${messageBody}"

This is a new conversation. Provide a professional response that:
1. Addresses their inquiry
2. Naturally asks for their name
3. Sets up for gathering more customer information`
                });
            }

            console.log(`🧠 Sending ${conversationHistory.length} messages of context to AI`);

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

        // Combine all messages to analyze
        const allMessages = [
            ...conversationHistory.map(msg => msg.body),
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
            status.push(`❌ Name: Not collected`);
        }

        if (info.isRepeatCustomer !== null) {
            status.push(`✅ Customer Type: ${info.isRepeatCustomer ? 'Repeat Customer' : 'New Customer'}`);
        } else {
            status.push(`❌ Customer Type: Unknown`);
        }

        if (info.address) {
            status.push(`✅ Address: ${info.address}`);
        } else if (info.isRepeatCustomer === false) {
            status.push(`❌ Address: Needed for new customer`);
        } else {
            status.push(`⏳ Address: May need verification`);
        }

        if (info.vehicle.details) {
            status.push(`✅ Vehicle: ${info.vehicle.details}`);
        } else {
            status.push(`❌ Vehicle: Not fully specified`);
        }

        if (info.serviceNeeded) {
            status.push(`✅ Service: ${info.serviceNeeded}`);
        } else {
            status.push(`❌ Service: Not specified`);
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
        // Enhanced fallback logic with customer data collection
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
                    
                    // Collect name if we don't have it
                    if (!customerInfo.fullName) {
                        return {
                            reply: "Perfect! I'd be happy to schedule that for you. Can I get your name for our appointment book?",
                            intent: "Customer Data Collection",
                            action: "Collect customer name for appointment",
                            customerData: {}
                        };
                    }
                    
                    return {
                        reply: `Great ${customerInfo.firstName || 'there'}! I'll get that appointment scheduled for you. I'll be in touch shortly with available times. Thanks for choosing Pink Chicken Speed Shop!`,
                        intent: "Booking Confirmation",
                        action: "Schedule appointment and send confirmation",
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
            
            if (!customerInfo.fullName) {
                return {
                    reply: "Hi! Thanks for reaching out about service. I'd be happy to help with your vehicle maintenance. My rate is $80/hr with a 1-hour minimum. Can I get your name to get started?",
                    intent: "Service Request + Data Collection",
                    action: "Collect customer name for service inquiry",
                    customerData: {}
                };
            }
            
            return {
                reply: `Hi ${customerInfo.firstName}! Thanks for reaching out about service. I'd be happy to help with your vehicle maintenance. My rate is $80/hr with a 1-hour minimum. I'll get back to you shortly with more details!`,
                intent: "Service Request",
                action: "Follow up with service quote",
                customerData: customerInfo
            };
        }

        // Quote requests
        if (lowerMessage.includes('quote') ||
            lowerMessage.includes('price') ||
            lowerMessage.includes('cost') ||
            lowerMessage.includes('estimate') ||
            lowerMessage.includes('how much')) {
            
            if (!customerInfo.fullName) {
                return {
                    reply: "Thanks for your quote request! I'd be happy to provide an estimate. My labor rate is $80/hr with a 1-hour minimum. What's your name so I can prepare a personalized quote for you?",
                    intent: "Quote Request + Data Collection",
                    action: "Collect customer name for quote",
                    customerData: {}
                };
            }
            
            return {
                reply: `Thanks for your quote request, ${customerInfo.firstName}! I'd be happy to provide an estimate. My labor rate is $80/hr with a 1-hour minimum. I'll review your message and get back to you with a detailed quote soon.`,
                intent: "Quote Request",
                action: "Prepare detailed quote",
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
            
            if (!customerInfo.fullName) {
                return {
                    reply: "I received your message about the issue with your vehicle. I'll take a look at what you've described and get back to you with next steps. My diagnostic rate is $80/hr. What's your name so I can help you properly?",
                    intent: "Repair Request + Data Collection",
                    action: "Collect customer name for repair inquiry",
                    customerData: {}
                };
            }
            
            return {
                reply: `Hi ${customerInfo.firstName}! I received your message about the issue with your vehicle. I'll take a look at what you've described and get back to you with next steps. My diagnostic rate is $80/hr. Thanks for reaching out!`,
                intent: "Repair Request",
                action: "Diagnose issue and provide solution",
                customerData: customerInfo
            };
        }

        // Booking/appointment requests
        if (lowerMessage.includes('appointment') ||
            lowerMessage.includes('schedule') ||
            lowerMessage.includes('book') ||
            lowerMessage.includes('available') ||
            lowerMessage.includes('when can')) {
            
            if (!customerInfo.fullName) {
                return {
                    reply: "Thanks for wanting to schedule service! I'll check my availability and get back to you with some time options. My rate is $80/hr with a 1-hour minimum. Can I get your name for the appointment?",
                    intent: "Booking Request + Data Collection",
                    action: "Collect customer name for appointment",
                    customerData: {}
                };
            }
            
            return {
                reply: `Thanks for wanting to schedule service, ${customerInfo.firstName}! I'll check my availability and get back to you with some time options. My rate is $80/hr with a 1-hour minimum. Looking forward to helping you!`,
                intent: "Booking Request",
                action: "Check schedule and offer appointment times",
                customerData: customerInfo
            };
        }

        // Default response for any other message
        if (!customerInfo.fullName) {
            return {
                reply: "Hi! Thanks for your message. I'm Pink Chicken Speed Shop and I received your inquiry. I'll review it and get back to you personally within the hour. My rate is $80/hr. What's your name so I can assist you properly?",
                intent: "General Inquiry + Data Collection",
                action: "Collect customer name and review message",
                customerData: {}
            };
        }
        
        return {
            reply: `Hi ${customerInfo.firstName}! Thanks for your message. I'm Pink Chicken Speed Shop and I received your inquiry. I'll review it and get back to you personally within the hour. My rate is $80/hr. Thanks for choosing us!`,
            intent: "General Inquiry",
            action: "Review message and provide personalized response",
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