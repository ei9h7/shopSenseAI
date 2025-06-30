# ShopSenseAI - AI Service Advisor

> **Built with [Bolt.new](https://bolt.new)** ⚡

**Instant quotes. Automated booking. More wrench time.**

An AI-powered service advisor application for solo mechanics, featuring automated message processing, intelligent customer communication, and graceful AI fallbacks to prevent customer loss.

## 🚀 Live Demo

- **Frontend**: https://shopsenseai.app
- **Backend API**: https://torquegpt.onrender.com
- **Webhook URL**: https://torquegpt.onrender.com/api/webhooks/openphone

## ✨ Key Features

### 🤖 **Intelligent AI Processing**
- **OpenAI GPT-4 Integration**: Processes customer messages and generates professional responses
- **Graceful Fallback System**: When AI credits run out, uses intelligent keyword-based responses
- **Emergency Detection**: Automatically identifies and prioritizes urgent messages
- **Quote Generation**: AI estimates repair time and generates quotes using $80/hr rate
- **Tech Sheet Generation**: Auto-creates detailed repair guides from accepted quotes

### 📱 **SMS Communication**
- **OpenPhone Integration**: Receives and sends SMS messages via webhooks
- **Real-time Processing**: Instant message processing and response
- **Conversation Management**: Organized conversation view with message history
- **Manual Override**: Send custom replies when needed

### 🛡️ **Business Protection**
- **Never Lose Customers**: Intelligent fallbacks ensure customers always get responses
- **Do Not Disturb Mode**: Toggle automatic AI responses (defaults to ON)
- **Emergency Override**: Critical messages bypass DND settings
- **Professional Responses**: Maintains business reputation even when AI is unavailable

### ⚙️ **Production-Ready Architecture**
- **Persistent API Keys**: Server environment variables survive deployments
- **Health Monitoring**: Real-time server status and webhook monitoring
- **Error Handling**: Comprehensive error handling and logging
- **Scalable Design**: Separate frontend/backend for optimal performance

### 🔧 **Workshop Management**
- **Tech Sheet Generation**: AI-powered repair guides with step-by-step instructions
- **Quote Management**: Professional quote creation and tracking
- **Customer Communication**: Centralized message management
- **Business Settings**: Configurable labor rates and business information

## 🏗️ Architecture

```
Customer SMS → OpenPhone → Webhook Server (Render) → AI Processing → SMS Response
                    ↓
Frontend App (Netlify) ← Settings Sync ← Server Environment Variables
                    ↓
Tech Sheet Generation ← Quote Acceptance ← AI Processing
```

### **Components:**
- **Frontend (React + TypeScript)**: User interface hosted on Netlify
- **Backend (Node.js + Express)**: Webhook server hosted on Render
- **AI Processing**: OpenAI GPT-4 with intelligent fallbacks
- **SMS Gateway**: OpenPhone API for reliable message delivery
- **Tech Sheets**: AI-generated repair guides for workshop use

## 🚀 Quick Start

### Prerequisites
- OpenAI API key (for AI processing)
- OpenPhone account with API key and phone number
- Render account (for webhook server)
- Netlify account (for frontend hosting)

### 1. Server Deployment (Render)

1. **Fork this repository** to your GitHub account

2. **Create a new Web Service** on [Render](https://render.com):
   - Connect your GitHub repository
   - Set **Root Directory**: `server`
   - Set **Build Command**: `npm install && npm run build`
   - Set **Start Command**: `npm start`

3. **Add Environment Variables** in Render dashboard:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENPHONE_API_KEY=your_openphone_api_key_here
   OPENPHONE_PHONE_NUMBER=your_openphone_number_here
   BUSINESS_NAME=Pink Chicken Speed Shop
   LABOR_RATE=80
   DND_ENABLED=true
   NODE_ENV=production
   ```

4. **Deploy** - Render will automatically build and deploy your webhook server

### 2. Frontend Deployment (Netlify)

1. **Create a new site** on [Netlify](https://netlify.com):
   - Connect your GitHub repository
   - Set **Build Command**: `npm run build`
   - Set **Publish Directory**: `dist`

2. **Deploy** - Netlify will automatically build and deploy your frontend

### 3. OpenPhone Webhook Configuration

1. **Go to OpenPhone Dashboard** → Settings → Webhooks
2. **Add New Webhook**:
   - **URL**: `https://your-render-app.onrender.com/api/webhooks/openphone`
   - **Events**: Select "Message Received"
   - **Save** the webhook configuration

### 4. Test Your Setup

1. **Health Check**: Visit `https://your-render-app.onrender.com/health`
2. **Send Test SMS**: Send a message to your OpenPhone number
3. **Check Logs**: Monitor Render logs for message processing
4. **Verify Response**: Confirm AI response is sent back via SMS

## 🔧 Local Development

### Installation
```bash
# Clone the repository
git clone <your-repository-url>
cd shopsenseai

# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### Environment Setup
```bash
# Frontend environment (optional for local development)
cp .env.example .env

# Server environment (required)
cd server
cp .env.example .env
# Edit server/.env with your API keys
```

### Development Commands
```bash
# Start frontend only (connects to production API)
npm run dev

# Start server only (for webhook development)
cd server && npm run dev

# Build for production
npm run build
```

## 📊 Features Overview

### **Dashboard**
- Real-time message statistics
- Emergency message alerts
- Quick action buttons
- Recent activity feed
- Do Not Disturb toggle

### **Messages**
- Conversation-style interface
- Emergency message highlighting
- Manual reply capability
- Read/unread status tracking
- Phone number management

### **Quotes**
- AI-generated service quotes
- Labor rate calculation ($80/hr minimum)
- Parts cost tracking
- Quote status management
- Auto tech sheet generation on acceptance

### **Tech Sheets**
- AI-generated repair guides
- Step-by-step instructions
- Tool and parts requirements
- Safety warnings
- Professional tips
- Downloadable formats

### **Settings**
- API key configuration
- Server settings sync
- Business information
- GST/tax settings
- Webhook status monitoring

## 🛡️ AI Fallback System

When OpenAI API is unavailable (rate limits, no credits, network issues), the system uses intelligent keyword-based responses:

### **Emergency Detection**
Keywords: `emergency`, `urgent`, `breakdown`, `stranded`, `accident`, `help`, `stuck`
Response: Immediate acknowledgment with 15-minute callback promise

### **Service Requests**
Keywords: `oil change`, `service`, `maintenance`, `tune up`, `inspection`
Response: Professional service inquiry acknowledgment with rate information

### **Quote Requests**
Keywords: `quote`, `price`, `cost`, `estimate`, `how much`
Response: Quote request acknowledgment with labor rate details

### **Repair Issues**
Keywords: `problem`, `issue`, `broken`, `noise`, `leak`, `won't start`
Response: Diagnostic inquiry acknowledgment with next steps

### **Booking Requests**
Keywords: `appointment`, `schedule`, `book`, `available`, `when can`
Response: Scheduling inquiry with availability check promise

## 🔍 Monitoring & Health Checks

### **Server Health**
- **Endpoint**: `https://torquegpt.onrender.com/health`
- **Response**: Server status, timestamp, environment info

### **Settings API**
- **Endpoint**: `https://torquegpt.onrender.com/api/settings`
- **Response**: API key status, business settings, configuration info

### **Messages API**
- **Endpoint**: `https://torquegpt.onrender.com/api/messages`
- **Response**: Message history, conversation data

### **Webhook Testing**
```bash
# Test webhook endpoint
curl -X POST https://torquegpt.onrender.com/api/webhooks/openphone \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

## 🚨 Troubleshooting

### **Webhook Not Receiving Messages**
1. Check OpenPhone webhook URL configuration
2. Verify Render server is running (`/health` endpoint)
3. Check Render logs for incoming webhook requests
4. Ensure webhook URL uses HTTPS

### **AI Not Responding**
1. Verify OpenAI API key is valid and has credits
2. Check server environment variables
3. Monitor server logs for AI processing errors
4. Fallback system should still provide responses

### **SMS Not Sending**
1. Verify OpenPhone API key and permissions
2. Check phone number format and configuration
3. Monitor server logs for OpenPhone API errors
4. Test with OpenPhone API directly

### **Frontend Not Loading Settings**
1. Check if server is running (`/health` endpoint)
2. Verify CORS configuration allows frontend domain
3. Check browser console for API errors
4. Refresh settings using the refresh button

### **Tech Sheet Generation Failing**
1. Verify OpenAI API key is configured
2. Check API credits and rate limits
3. Monitor browser console for errors
4. Try with simpler job descriptions

## 🔐 Security Considerations

### **API Key Management**
- Store API keys as environment variables on server
- Never commit API keys to version control
- Use masked display in frontend (••••••••1234)
- Rotate keys regularly

### **Webhook Security**
- Use HTTPS for all webhook URLs
- Validate webhook payloads
- Implement rate limiting if needed
- Monitor for suspicious activity

### **Data Privacy**
- Messages stored temporarily for processing
- No persistent customer data storage
- Secure transmission via HTTPS
- Minimal data retention

## 📈 Performance Optimization

### **Cost Management**
- Uses GPT-4o-mini for cost efficiency
- Limits response length (500 tokens max)
- 30-second timeout on AI requests
- Intelligent fallbacks reduce API usage

### **Reliability**
- Multiple authentication methods for OpenPhone
- Graceful error handling throughout
- Health check endpoints for monitoring
- Automatic retry logic where appropriate

## 🤝 Contributing

This project was built with [Bolt.new](https://bolt.new), an AI-powered development platform. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Built with [Bolt.new](https://bolt.new)** - AI-powered development platform
- **OpenAI** - GPT-4 AI processing
- **OpenPhone** - SMS communication platform
- **Render** - Backend hosting
- **Netlify** - Frontend hosting

---

**ShopSenseAI** - Never lose a customer to missed messages again! 🚗⚡

*Instant quotes. Automated booking. More wrench time.*