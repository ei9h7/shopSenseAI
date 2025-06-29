import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import { handleOpenPhoneWebhook } from './webhooks/openphone.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://clinquant-starship-25fe89.netlify.app']
    : ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TorqueSheetGPT Webhook Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      webhook: '/api/webhooks/openphone'
    }
  })
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`)
  
  // Show the correct URLs based on environment
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://torquegpt.onrender.com'  // Your actual Render URL
    : `http://localhost:${PORT}`
  
  console.log(`📡 OpenPhone webhook URL: ${baseUrl}/api/webhooks/openphone`)
  console.log(`🏥 Health check: ${baseUrl}/health`)
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`✅ TorqueSheetGPT webhook server deployed successfully!`)
    console.log(`🔗 Use this webhook URL in OpenPhone: ${baseUrl}/api/webhooks/openphone`)
  }
})

export default app