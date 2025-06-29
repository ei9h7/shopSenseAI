import type { Request, Response } from 'express'
import { messageProcessor } from '../services/messageProcessor.js'

export interface OpenPhoneWebhookPayload {
  id: string
  object: string
  createdAt: string
  data: {
    id: string
    object: string
    createdAt: string
    direction: 'inbound' | 'outbound'
    to: string
    from: string
    body: string
    media: any[]
    phoneNumberId: string
    userId: string
  }
}

export async function handleOpenPhoneWebhook(req: Request, res: Response) {
  try {
    console.log('🔔 Webhook received:', JSON.stringify(req.body, null, 2))
    
    const payload: OpenPhoneWebhookPayload = req.body

    // Verify this is a message event
    if (payload.object !== 'event' || !payload.data || payload.data.object !== 'message') {
      console.log('ℹ️  Not a message event, ignoring')
      return res.status(200).json({ received: true })
    }

    // Only process inbound messages
    if (payload.data.direction !== 'inbound') {
      console.log('ℹ️  Outbound message, ignoring')
      return res.status(200).json({ received: true })
    }

    // Extract message data
    const phoneNumber = payload.data.from
    const messageBody = payload.data.body

    console.log(`📱 Processing inbound message from ${phoneNumber}`)

    // Initialize message processor if not already done
    await messageProcessor.initialize()

    // Process the message
    await messageProcessor.processIncomingMessage(phoneNumber, messageBody)

    // Respond to OpenPhone
    res.status(200).json({ received: true, processed: true })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}