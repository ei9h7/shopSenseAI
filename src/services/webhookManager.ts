import { messageProcessor } from './messageProcessor'

export class WebhookManager {
  private static instance: WebhookManager
  private isInitialized = false

  static getInstance(): WebhookManager {
    if (!WebhookManager.instance) {
      WebhookManager.instance = new WebhookManager()
    }
    return WebhookManager.instance
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      // Initialize message processor
      await messageProcessor.initialize()
      
      this.isInitialized = true
      console.log('Webhook manager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize webhook manager:', error)
    }
  }

  async processWebhookMessage(phoneNumber: string, messageBody: string) {
    if (!this.isInitialized) {
      await this.initialize()
    }

    return messageProcessor.processIncomingMessage(phoneNumber, messageBody)
  }

  getWebhookUrl(): string {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'
      : 'http://localhost:3001'
    
    return `${baseUrl}/api/webhooks/openphone`
  }
}

export const webhookManager = WebhookManager.getInstance()