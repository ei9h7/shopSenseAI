# TorqueSheetGPT Deployment Guide

This guide covers deploying both the frontend (React app) and backend (webhook server) separately.

## Frontend Deployment (Already Done)

✅ **Status: Deployed to Netlify**
- URL: https://clinquant-starship-25fe89.netlify.app
- Auto-deploys from main branch

## Backend Deployment (✅ COMPLETED)

✅ **Status: Deployed to Render**
- URL: https://torquegpt.onrender.com
- Webhook URL: https://torquegpt.onrender.com/api/webhooks/openphone

## Quick Start Guide

### 1. Add Environment Variables to Render

Go to your Render dashboard and add these environment variables:

```
OPENAI_API_KEY=your_openai_api_key_here
OPENPHONE_API_KEY=your_openphone_api_key_here
OPENPHONE_PHONE_NUMBER=your_openphone_number_here
BUSINESS_NAME=Pink Chicken Speed Shop
LABOR_RATE=80
DND_ENABLED=false
NODE_ENV=production
```

### 2. Configure OpenPhone Webhook

1. Go to your OpenPhone dashboard
2. Navigate to Settings → Webhooks
3. Add a new webhook with URL: `https://torquegpt.onrender.com/api/webhooks/openphone`
4. Select "Message Received" as the trigger event
5. Save the configuration

### 3. Test Your Setup

1. **Health check:** Visit https://torquegpt.onrender.com/health
2. **Send a test SMS** to your OpenPhone number
3. **Check logs** in your Render dashboard
4. **Verify response** is sent back via SMS

## Local Development Setup

### Prerequisites
- Node.js 18+
- OpenAI API key
- OpenPhone API key and phone number

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd torquesheetgpt
   npm install
   ```

2. **Set up environment files**
   ```bash
   # Frontend environment
   cp .env.example .env
   
   # Backend environment
   cd server
   cp .env.example .env
   cd ..
   ```

3. **Configure environment variables**
   
   **Frontend (.env):**
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_OPENPHONE_API_KEY=your_openphone_api_key_here
   VITE_OPENPHONE_PHONE_NUMBER=your_openphone_number_here
   VITE_BUSINESS_NAME=Pink Chicken Speed Shop
   VITE_LABOR_RATE=80
   ```
   
   **Backend (server/.env):**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENPHONE_API_KEY=your_openphone_api_key_here
   OPENPHONE_PHONE_NUMBER=your_openphone_number_here
   BUSINESS_NAME=Pink Chicken Speed Shop
   LABOR_RATE=80
   DND_ENABLED=false
   NODE_ENV=development
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```
   This starts both frontend (port 5173) and backend (port 3001)

### Alternative Start Commands
- Frontend only: `npm run dev:client`
- Backend only: `npm run dev:server`
- Production build: `npm run build`

## Testing Commands

```bash
# Test health endpoint
curl https://torquegpt.onrender.com/health

# Test webhook endpoint (for debugging)
curl -X POST https://torquegpt.onrender.com/api/webhooks/openphone \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

## Environment Variables Summary

### Frontend (.env for local development)
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENPHONE_API_KEY=your_openphone_api_key_here
VITE_OPENPHONE_PHONE_NUMBER=your_openphone_number_here
VITE_BUSINESS_NAME=Pink Chicken Speed Shop
VITE_LABOR_RATE=80
```

### Backend (Production environment variables in Render)
```
OPENAI_API_KEY=your_openai_api_key_here
OPENPHONE_API_KEY=your_openphone_api_key_here
OPENPHONE_PHONE_NUMBER=your_openphone_number_here
BUSINESS_NAME=Pink Chicken Speed Shop
LABOR_RATE=80
DND_ENABLED=false
NODE_ENV=production
```

## Architecture

```
Customer SMS → OpenPhone → Webhook Server (Render) → AI Processing → SMS Response
                    ↓
Frontend App (Netlify) ← Local Storage ← Message Display
```

## Features

- **Graceful AI Fallback**: When OpenAI credits run out, intelligent fallback responses prevent customer loss
- **Emergency Detection**: Automatically detects and prioritizes urgent messages
- **Do Not Disturb Mode**: Toggle automatic AI responses on/off
- **Comprehensive Logging**: Detailed logs for debugging and monitoring

## Troubleshooting

### If webhook isn't working:
1. Check Render logs for errors
2. Verify environment variables are set
3. Test health endpoint: https://torquegpt.onrender.com/health
4. Verify OpenPhone webhook URL is correct

### If AI responses aren't working:
1. Check OpenAI API key is valid and has credits
2. Check OpenPhone API key is valid
3. Verify DND_ENABLED is set to "true" for auto-responses
4. System will use intelligent fallback if AI fails

### If messages aren't appearing in frontend:
1. The frontend uses localStorage for demo purposes
2. Real integration would sync with the webhook server
3. For now, messages are processed server-side only

### If server won't start locally:
1. Ensure all environment variables are set in both `.env` files
2. Check Node.js version (requires 18+)
3. Run `npm install` in both root and server directories
4. Check for port conflicts (3001 for server, 5173 for frontend)

## Success! 🎉

Your TorqueSheetGPT system is now fully deployed:
- ✅ Frontend: https://clinquant-starship-25fe89.netlify.app
- ✅ Webhook Server: https://torquegpt.onrender.com
- ✅ Ready for OpenPhone integration
- ✅ Graceful AI fallback prevents customer loss