import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import { handleOpenPhoneWebhook } from './webhooks/openphone.js'
import { messageProcessor } from './services/messageProcessor.js'

const app = express()
const PORT = process.env.PORT || 10000

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://clinquant-starship-25fe89.netlify.app']
    : ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint - must respond quickly for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TorqueSheetGPT Webhook Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/api/webhooks/openphone',
      messages: '/api/messages',
      settings: '/api/settings'
    }
  })
})

// Settings API endpoint (NEW)
app.get('/api/settings', (req, res) => {
  try {
    const settings = {
      openai_configured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10),
      openphone_configured: !!(process.env.OPENPHONE_API_KEY && process.env.OPENPHONE_API_KEY.length > 10),
      business_name: process.env.BUSINESS_NAME || 'Pink Chicken Speed Shop',
      labor_rate: parseInt(process.env.LABOR_RATE || '80'),
      dnd_enabled: process.env.DND_ENABLED === 'true',
      openai_key_preview: process.env.OPENAI_API_KEY ? 
        `••••••••${process.env.OPENAI_API_KEY.slice(-4)}` : undefined,
      openphone_key_preview: process.env.OPENPHONE_API_KEY ? 
        `••••••••${process.env.OPENPHONE_API_KEY.slice(-4)}` : undefined
    }
    
    res.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// Messages API endpoint
app.get('/api/messages', async (req, res) => {
  try {
    await messageProcessor.initialize()
    const messages = messageProcessor.getMessages()
    res.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// Mark message as read
app.post('/api/messages/:id/read', async (req, res) => {
  try {
    const { id } = req.params
    await messageProcessor.initialize()
    messageProcessor.markMessageAsRead(id)
    res.json({ success: true })
  } catch (error) {
    console.error('Error marking message as read:', error)
    res.status(500).json({ error: 'Failed to mark message as read' })
  }
})

// Send manual reply
app.post('/api/messages/reply', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' })
    }
    
    await messageProcessor.initialize()
    await messageProcessor.sendManualReply(phoneNumber, message)
    res.json({ success: true })
  } catch (error) {
    console.error('Error sending manual reply:', error)
    res.status(500).json({ error: 'Failed to send reply' })
  }
})

// OpenPhone webhook endpoint
app.post('/api/webhooks/openphone', handleOpenPhoneWebhook)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  process.exit(0)
})

// Start server - bind to 0.0.0.0 for Render
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Webhook server running on port ${PORT}`)
  
  // Show the correct URLs based on environment
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://torquegpt.onrender.com'  // Your actual Render URL
    : `http://localhost:${PORT}`
  
  console.log(`📡 OpenPhone webhook URL: ${baseUrl}/api/webhooks/openphone`)
  console.log(`🏥 Health check: ${baseUrl}/health`)
  console.log(`📨 Messages API: ${baseUrl}/api/messages`)
  console.log(`⚙️  Settings API: ${baseUrl}/api/settings`)
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`✅ TorqueSheetGPT webhook server deployed successfully!`)
    console.log(`🔗 Use this webhook URL in OpenPhone: ${baseUrl}/api/webhooks/openphone`)
  }
})

// Handle server errors
server.on('error', (error: any) => {
  console.error('❌ Server error:', error)
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`)
    process.exit(1)
  }
})

export default app