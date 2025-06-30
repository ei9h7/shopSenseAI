import { messageProcessor } from '../services/messageProcessor.js';

export async function handleOpenPhoneWebhook(req, res) {
    try {
        console.log('🔔 Webhook received:', JSON.stringify(req.body, null, 2));
        const payload = req.body;

        // Verify this is a message event
        if (payload.object !== 'event' || !payload.data || !payload.data.object) {
            console.log('ℹ️  Not a message event, ignoring');
            return res.status(200).json({ received: true });
        }

        // Check if it's a message object
        if (payload.data.object.object !== 'message') {
            console.log('ℹ️  Not a message object, ignoring');
            return res.status(200).json({ received: true });
        }

        // Only process incoming messages
        if (payload.data.object.direction !== 'incoming') {
            console.log('ℹ️  Outbound message, ignoring');
            return res.status(200).json({ received: true });
        }

        // Extract message data from the nested object
        const phoneNumber = payload.data.object.from;
        const messageBody = payload.data.object.body;
        
        // Extract OpenPhone IDs for API calls
        const phoneNumberId = payload.data.object.phoneNumberId; // e.g., "PNkAboSWjm"
        const conversationId = payload.data.object.conversationId; // e.g., "CNce2e2e73de4a489ca38ed6e948818572"
        
        console.log(`📱 Processing incoming message from ${phoneNumber}: "${messageBody}"`);
        console.log(`📋 OpenPhone IDs - PhoneNumberId: ${phoneNumberId}, ConversationId: ${conversationId}`);

        // Initialize message processor if not already done
        await messageProcessor.initialize();
        
        // Update the OpenPhone service with the phoneNumberId for better API calls
        if (messageProcessor.openPhone && phoneNumberId) {
            messageProcessor.openPhone.setPhoneNumberId(phoneNumberId);
        }

        // Process the message
        await messageProcessor.processIncomingMessage(phoneNumber, messageBody);

        console.log('✅ Message processed successfully');

        // Respond to OpenPhone
        res.status(200).json({ received: true, processed: true });
    }
    catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}