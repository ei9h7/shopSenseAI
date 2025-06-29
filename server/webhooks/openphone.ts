import type { Request, Response } from 'express'
import { messageProcessor } from '../services/messageProcessor.js'

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

    // Only process incoming messages
    if (payload.data.object.direction !== 'incoming') {
      console.log('ℹ️  Outbound message, ignoring')
      return res.status(200).json({ received: true })
    }

    // Extract message data from the nested object
    const phoneNumber = payload.data.object.from
    const messageBody = payload.data.object.body

    console.log(`📱 Processing incoming message from ${phoneNumber}: "${messageBody}"`)

    // Initialize message processor if not already done
    await messageProcessor.initialize()

    // Process the message
    await messageProcessor.processIncomingMessage(phoneNumber, messageBody)

    console.log('✅ Message processed successfully')

    // Respond to OpenPhone
    res.status(200).json({ received: true, processed: true })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}