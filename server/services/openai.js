import axios from 'axios';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAIService {
    apiKey;

    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Processes a message with full conversation context
     * This provides the AI with the conversation history to maintain context
     */
    async processMessageWithContext(messageBody, conversationHistory, businessName = 'Pink Chicken Speed Shop') {
        try {
            // Build conversation context for AI
            const messages = [
                {
                    role: 'system',
                    content: `You are a professional, friendly assistant for ${businessName}, an automotive repair shop. 

IMPORTANT CONTEXT RULES:
- You have access to the full conversation history with this customer
- Use the conversation context to provide relevant, contextual responses
- If the customer is responding to a previous question or quote, acknowledge that context
- If they say "yes" or "sure" or similar, refer to what they're agreeing to based on the conversation
- Maintain conversation flow and don't repeat information already discussed
- Your labor rate is $80/hr with a 1-hour minimum ($20 per 15 min extra)

RESPONSE FORMAT:
Reply: [The contextual message to text back]
Intent: [e.g. Quote Request, Booking Confirmation, Emergency, Follow-up]
Action: [e.g. Send booking link, Prepare quote, Schedule appointment]`
                }
            ];

            // Add conversation history for context (if available)
            if (conversationHistory && conversationHistory.length > 0) {
                messages.push({
                    role: 'user',
                    content: `CONVERSATION HISTORY (most recent last):
${conversationHistory.map(msg => 
    `${msg.direction === 'inbound' ? 'CUSTOMER' : 'YOU'}: "${msg.body}"`
).join('\n')}

CURRENT MESSAGE FROM CUSTOMER: "${messageBody}"

Based on this conversation history, provide a contextual response that acknowledges what has been discussed and responds appropriately to their current message.`
                });
            } else {
                // No conversation history - treat as new conversation
                messages.push({
                    role: 'user',
                    content: `This is a new conversation. Customer message: "${messageBody}"

Provide a professional response as an automotive repair shop assistant.`
                });
            }

            console.log(`🧠 Sending ${conversationHistory.length} messages of context to AI`);

            const response = await axios.post(OPENAI_API_URL, {
                model: 'gpt-4o',
                temperature: 0.6,
                max_tokens: 500,
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
                return this.getIntelligentFallback(messageBody);
            }
            
            if (error.response?.status === 401) {
                console.log('⚠️  Invalid API key - using fallback response');
                return this.getIntelligentFallback(messageBody);
            }
            
            if (error.response?.status >= 400) {
                console.log('⚠️  API error - using fallback response');
                return this.getIntelligentFallback(messageBody);
            }
            
            // Network or other errors
            console.log('⚠️  Network/timeout error - using fallback response');
            return this.getIntelligentFallback(messageBody);
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    async processMessage(messageBody, businessName = 'Pink Chicken Speed Shop') {
        return this.processMessageWithContext(messageBody, [], businessName);
    }

    getIntelligentFallback(messageBody) {
        // Intelligent fallback logic when AI is unavailable
        const lowerMessage = messageBody.toLowerCase();
        
        // Emergency detection
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
                action: "URGENT - Contact customer immediately"
            };
        }
        
        // Positive responses (yes, sure, okay, etc.)
        if (lowerMessage.includes('yes') || 
            lowerMessage.includes('sure') || 
            lowerMessage.includes('okay') ||
            lowerMessage.includes('ok') ||
            lowerMessage.includes('sounds good') ||
            lowerMessage.includes('that works')) {
            return {
                reply: "Great! I'll get that set up for you. I'll be in touch shortly with the next steps. Thanks for choosing Pink Chicken Speed Shop!",
                intent: "Confirmation",
                action: "Follow up with confirmed service"
            };
        }
        
        // Service/maintenance requests
        if (lowerMessage.includes('oil change') || 
            lowerMessage.includes('service') || 
            lowerMessage.includes('maintenance') ||
            lowerMessage.includes('tune up') ||
            lowerMessage.includes('inspection')) {
            return {
                reply: "Hi! Thanks for reaching out about service. I'd be happy to help with your vehicle maintenance. My rate is $80/hr with a 1-hour minimum. I'll get back to you shortly with more details!",
                intent: "Service Request",
                action: "Follow up with service quote"
            };
        }
        
        // Quote requests
        if (lowerMessage.includes('quote') || 
            lowerMessage.includes('price') || 
            lowerMessage.includes('cost') ||
            lowerMessage.includes('estimate') ||
            lowerMessage.includes('how much')) {
            return {
                reply: "Thanks for your quote request! I'd be happy to provide an estimate. My labor rate is $80/hr with a 1-hour minimum. I'll review your message and get back to you with a detailed quote soon.",
                intent: "Quote Request",
                action: "Prepare detailed quote"
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
                reply: "I received your message about the issue with your vehicle. I'll take a look at what you've described and get back to you with next steps. My diagnostic rate is $80/hr. Thanks for reaching out!",
                intent: "Repair Request",
                action: "Diagnose issue and provide solution"
            };
        }
        
        // Booking/appointment requests
        if (lowerMessage.includes('appointment') || 
            lowerMessage.includes('schedule') || 
            lowerMessage.includes('book') ||
            lowerMessage.includes('available') ||
            lowerMessage.includes('when can')) {
            return {
                reply: "Thanks for wanting to schedule service! I'll check my availability and get back to you with some time options. My rate is $80/hr with a 1-hour minimum. Looking forward to helping you!",
                intent: "Booking Request",
                action: "Check schedule and offer appointment times"
            };
        }
        
        // Default response for any other message
        return {
            reply: "Hi! Thanks for your message. I'm Pink Chicken Speed Shop and I received your inquiry. I'll review it and get back to you personally within the hour. My rate is $80/hr. Thanks for choosing us!",
            intent: "General Inquiry",
            action: "Review message and provide personalized response"
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