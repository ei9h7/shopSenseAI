import express from 'express'
import cors from 'cors'
import { handleOpenPhoneWebhook } from '../api/webhooks/openphone'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// OpenPhone webhook endpoint
app.post('/api/webhooks/openphone', handleOpenPhoneWebhook)

// Start server
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`)
  console.log(`OpenPhone webhook URL: http://localhost:${PORT}/api/webhooks/openphone`)
})

export default app