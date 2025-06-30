import axios from 'axios';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAIService {
    apiKey;

    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Processes a message with full conversation context and automatic booking detection
     */
    async processMessageWithContext(messageBody, conversationHistory, businessName = 'Pink Chicken Speed Shop') {
        try {
            // Build conversation context for AI
            const messages = [
                {
                    role: 'system',
                    content: `You are a professional, friendly assistant for ${businessName}, an automotive repair shop. 

CONVERSATION STYLE:
- Be natural and conversational, not pushy or aggressive
- Take whatever information the customer gives you naturally
- Focus on helping them with their actual need first
- Collect info organically during natural conversation

APPOINTMENT BOOKING:
When customers want to schedule service or confirm appointments:
- Suggest specific days and times (Monday-Friday, 8am-5pm)
- Confirm their preferred date and time
- Get essential info: name, vehicle, service needed
- Use this EXACT format when booking is confirmed:
  "BOOKING_CONFIRMED: [Customer Name] | [Phone] | [Vehicle] | [Service] | [Date] | [Time]"

QUOTE ACCEPTANCE:
When customers accept quotes or say "yes" to pricing:
- Confirm the acceptance
- Use format: "QUOTE_ACCEPTED: [Service] | [Price] | [Vehicle]"

EMERGENCY DETECTION:
If message contains urgent keywords (emergency, urgent, breakdown, stranded, accident):
- Respond immediately with emergency protocol
- Use format: "EMERGENCY: [Brief description]"

CONVERSATION RULES:
- Use the conversation history to provide contextual responses
- If customer says "yes" or agrees, refer to what they're agreeing to based on context
- Be helpful and focus on their actual automotive needs
- Your labor rate is $80/hr with a 1-hour minimum ($20 per 15 min extra)

RESPONSE FORMAT:
Reply: [The natural, helpful message that addresses their need]
Intent: [e.g. Quote Request, Booking Confirmation, Service Inquiry, Emergency]
Action: [e.g. BOOKING_CONFIRMED: details, Provide quote, Ask for vehicle details]`
                }
            ];

            // Add conversation history for context
            if (conversationHistory && conversationHistory.length > 0) {
                const recentHistory = conversationHistory.slice(-10);
                
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
4. If they want to book an appointment, confirm details and use BOOKING_CONFIRMED format
5. If they're accepting a quote, use QUOTE_ACCEPTED format
6. If it's an emergency, use EMERGENCY format`
                });
            } else {
                // New conversation - start naturally
                messages.push({
                    role: 'user',
                    content: `NEW CUSTOMER MESSAGE: "${messageBody}"

This is a new conversation. Provide a professional, natural response that:
1. Addresses their automotive inquiry helpfully
2. Focuses on their service needs first
3. Only asks for essential info if needed for their specific request
4. If they want to book, use BOOKING_CONFIRMED format
5. If emergency, use EMERGENCY format`
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
     * Legacy method for backward compatibility
     */
    async processMessage(messageBody, businessName = 'Pink Chicken Speed Shop') {
        return this.processMessageWithContext(messageBody, [], businessName);
    }

    getIntelligentFallback(messageBody, conversationHistory = []) {
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
                        reply: `Perfect! I'll get that scheduled for you. Thanks for choosing Pink Chicken Speed Shop!`,
                        intent: "Booking Confirmation",
                        action: `BOOKING_CONFIRMED: Customer | Phone needed | Vehicle TBD | Service TBD | Next available | 10:00`
                    };
                }

                if (lastOutboundMessage.body.toLowerCase().includes('quote') ||
                    lastOutboundMessage.body.toLowerCase().includes('estimate')) {
                    return {
                        reply: "Great! I'll prepare that quote for you and get back to you with the details shortly. Thanks for your business!",
                        intent: "Quote Confirmation",
                        action: "QUOTE_ACCEPTED: Service TBD | Price TBD | Vehicle TBD"
                    };
                }
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
                    action: `BOOKING_CONFIRMED: Customer | Phone needed | Vehicle TBD | Service TBD | ${day} | ${time}`
                };
            }
            
            return {
                reply: `I'd be happy to schedule an appointment for you! We're open Monday-Friday, 8am-5pm. What day and time works best for you?`,
                intent: "Booking Request",
                action: "Collect preferred appointment time"
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
                action: "EMERGENCY: Customer needs immediate assistance"
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
                action: "Collect vehicle and service details"
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
                action: "Collect vehicle and service details for quote"
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
                action: "Diagnose issue and provide solution"
            };
        }

        // Default response for any other message
        return {
            reply: `Hi! Thanks for your message. I'm Pink Chicken Speed Shop and I'd be happy to help with your automotive needs. My rate is $80/hr. What can I help you with today?`,
            intent: "General Inquiry",
            action: "Understand customer need"
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

        return { reply, intent, action };
    }
}