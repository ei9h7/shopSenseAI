import type { Request, Response } from 'express'
import { messageProcessor } from '../services/messageProcessor.js'

/**
 * OpenPhone Webhook Payload Interface
 * 
 * Defines the structure of webhook payloads received from OpenPhone.
 * This interface ensures type safety when processing incoming webhook data.
 */
export interface OpenPhoneWebhookPayload {
  id: string
  object: string
  apiVersion: string
  createdAt: string
  type: string
  data: {
    object: {
      id: string
      object: string
      from: string
      to: string
      createdBy: string | null
      direction: 'incoming' | 'outgoing'
      body: string
      media: any[]
      status: string
      createdAt: string
      userId: string
      phoneNumberId: string
      conversationId: string
    }
  }
}

/**
 * OpenPhone Webhook Handler
 * 
 * This function processes incoming webhook requests from OpenPhone when
 * SMS messages are received. It provides comprehensive validation,
 * filtering, and error handling to ensure reliable message processing.
 * 
 * Key Features:
 * - Validates webhook payload structure
 * - Filters for incoming messages only (ignores outbound)
 * - Extracts phone number and message content
 * - Initializes and delegates to message processor
 * - Provides detailed logging for debugging
 * - Returns appropriate HTTP status codes
 * 
 * The handler ensures that only valid incoming SMS messages are processed
 * and that OpenPhone receives proper acknowledgment of webhook delivery.
 * 
 * @param req - Express request object containing webhook payload
 * @param res - Express response object for sending acknowledgment
 */
export async function handleOpenPhoneWebhook(req: Request, res: Response) {
  try {
    console.log('🔔 Webhook received:', JSON.stringify(req.body, null, 2))
    
    const payload: OpenPhoneWebhookPayload = req.body

    // Verify this is a message event
    if (payload.object !== 'event' || !payload.data || !payload.data.object) {
      console.log('ℹ️  Not a message event, ignoring')
      return res.status(200).json({ received: true })
    }

    // Check if it's a message object
    if (payload.data.object.object !== 'message') {
      console.log('ℹ️  Not a message object, ignoring')
      return res.status(200).json({ received: true })
    }

    // Only process incoming messages (ignore our own outbound messages)
    if (payload.data.object.direction !== 'incoming') {
      console.log('ℹ️  Outbound message, ignoring')
      return res.status(200).json({ received: true })
    }

    // Extract message data from the nested object structure
    const phoneNumber = payload.data.object.from
    const messageBody = payload.data.object.body

    console.log(`📱 Processing incoming message from ${phoneNumber}: "${messageBody}"`)

    // Initialize message processor if not already done
    await messageProcessor.initialize()

    // Process the message through the AI system
    await messageProcessor.processIncomingMessage(phoneNumber, messageBody)

    console.log('✅ Message processed successfully')

    // Respond to OpenPhone with success acknowledgment
    res.status(200).json({ received: true, processed: true })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    
    // Return 500 error to OpenPhone so they know processing failed
    // This may trigger retry behavior depending on OpenPhone's configuration
    res.status(500).json({ error: 'Internal server error' })
  }
}