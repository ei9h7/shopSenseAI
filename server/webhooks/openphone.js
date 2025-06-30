import { messageProcessor } from '../services/messageProcessor.js';

export async function handleOpenPhoneWebhook(req, res) {
    try {
        console.log('🔔 OpenPhone webhook received');
        console.log('📋 Request method:', req.method);
        console.log('📋 Request URL:', req.url);
        console.log('📋 Request headers:', JSON.stringify(req.headers, null, 2));
        console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

        // Handle GET requests (for webhook verification)
        if (req.method === 'GET') {
            console.log('✅ GET request - webhook verification');
            return res.status(200).json({ 
                message: 'OpenPhone webhook endpoint is active',
                timestamp: new Date().toISOString(),
                server: 'ShopSenseAI'
            });
        }

        // Handle empty or malformed requests
        if (!req.body) {
            console.log('⚠️ Empty request body');
            return res.status(200).json({ 
                received: true, 
                message: 'Empty body received' 
            });
        }

        const payload = req.body;

        // Handle test webhooks or simple ping requests
        if (payload.test || payload.ping) {
            console.log('✅ Test/ping webhook received');
            return res.status(200).json({ 
                received: true, 
                message: 'Test webhook processed successfully' 
            });
        }

        // Verify this is a proper OpenPhone message event
        if (!payload.object || !payload.data) {
            console.log('⚠️ Invalid webhook payload structure - missing object or data');
            return res.status(200).json({ 
                received: true, 
                message: 'Invalid payload structure' 
            });
        }

        // Check if it's an event object
        if (payload.object !== 'event') {
            console.log('ℹ️ Not an event object, ignoring');
            return res.status(200).json({ received: true });
        }

        // Check if the data object exists and has the expected structure
        if (!payload.data.object) {
            console.log('ℹ️ No data.object found, ignoring');
            return res.status(200).json({ received: true });
        }

        // Check if it's a message object
        if (payload.data.object.object !== 'message') {
            console.log('ℹ️ Not a message object, ignoring');
            return res.status(200).json({ received: true });
        }

        // Only process incoming messages
        if (payload.data.object.direction !== 'incoming') {
            console.log('ℹ️ Outbound message, ignoring');
            return res.status(200).json({ received: true });
        }

        // Extract message data with safe fallbacks
        const phoneNumber = payload.data.object.from || 'unknown';
        const messageBody = payload.data.object.body || payload.data.object.text || '';
        
        // Validate required fields
        if (!phoneNumber || phoneNumber === 'unknown') {
            console.log('❌ Missing phone number in webhook payload');
            return res.status(400).json({ 
                error: 'Missing phone number',
                received: false 
            });
        }

        if (!messageBody) {
            console.log('❌ Missing message body in webhook payload');
            return res.status(400).json({ 
                error: 'Missing message body',
                received: false 
            });
        }
        
        // Extract OpenPhone IDs for API calls (with safe fallbacks)
        const phoneNumberId = payload.data.object.phoneNumberId || null;
        const conversationId = payload.data.object.conversationId || null;
        
        console.log(`📱 Processing incoming message from ${phoneNumber}: "${messageBody}"`);
        if (phoneNumberId) {
            console.log(`📋 OpenPhone IDs - PhoneNumberId: ${phoneNumberId}, ConversationId: ${conversationId}`);
        }

        // Initialize message processor if not already done
        try {
            await messageProcessor.initialize();
            console.log('✅ Message processor initialized');
        } catch (initError) {
            console.error('❌ Failed to initialize message processor:', initError);
            return res.status(500).json({ 
                error: 'Failed to initialize message processor',
                received: false 
            });
        }
        
        // Update the OpenPhone service with the phoneNumberId for better API calls
        if (messageProcessor.openPhone && phoneNumberId) {
            try {
                messageProcessor.openPhone.setPhoneNumberId(phoneNumberId);
                console.log('✅ Updated OpenPhone service with phoneNumberId');
            } catch (updateError) {
                console.warn('⚠️ Could not update OpenPhone service:', updateError);
            }
        }

        // Process the message
        try {
            await messageProcessor.processIncomingMessage(phoneNumber, messageBody);
            console.log('✅ Message processed successfully');
        } catch (processError) {
            console.error('❌ Error processing message:', processError);
            // Still return success to OpenPhone to avoid retries
            return res.status(200).json({ 
                received: true, 
                processed: false,
                error: 'Processing failed but webhook acknowledged'
            });
        }

        // Respond to OpenPhone
        res.status(200).json({ 
            received: true, 
            processed: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Return 200 to prevent OpenPhone from retrying
        res.status(200).json({ 
            received: true,
            processed: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
}