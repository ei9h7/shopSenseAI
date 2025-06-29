# TorqueGPT Deployment Guide

This guide covers deploying both the frontend (React app) and backend (webhook server) separately.

## Frontend Deployment (Already Done)

✅ **Status: Deployed to Netlify**
- URL: https://clinquant-starship-25fe89.netlify.app
- Auto-deploys from main branch

## Backend Deployment (Webhook Server)

The webhook server needs to be deployed separately to handle OpenPhone webhooks.

### Option 1: Railway (Recommended)

Railway is perfect for Node.js applications and provides easy deployment.

#### Steps:

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

3. **Login to Railway:**
   ```bash
   railway login
   ```

4. **Initialize and deploy:**
   ```bash
   railway init
   railway up
   ```

5. **Set environment variables in Railway dashboard:**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENPHONE_API_KEY=your_openphone_api_key_here
   OPENPHONE_PHONE_NUMBER=your_openphone_number_here
   BUSINESS_NAME=Pink Chicken Speed Shop
   LABOR_RATE=80
   DND_ENABLED=false
   NODE_ENV=production
   ```

6. **Get your webhook URL:**
   After deployment, you'll get a URL like: `https://your-app.railway.app`
   Your webhook endpoint will be: `https://your-app.railway.app/api/webhooks/openphone`

### Option 2: Render

1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Set root directory to `server`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add environment variables in Render dashboard

### Option 3: Heroku

1. Install Heroku CLI
2. From server directory:
   ```bash
   heroku create your-app-name
   heroku config:set OPENAI_API_KEY=your_key
   heroku config:set OPENPHONE_API_KEY=your_key
   heroku config:set OPENPHONE_PHONE_NUMBER=your_number
   git init
   git add .
   git commit -m "Initial commit"
   heroku git:remote -a your-app-name
   git push heroku main
   ```

## Configure OpenPhone Webhook

Once your webhook server is deployed:

1. Go to your OpenPhone dashboard
2. Navigate to Settings → Webhooks
3. Add a new webhook with URL: `https://your-deployed-server.com/api/webhooks/openphone`
4. Select "Message Received" as the trigger event
5. Save the configuration

## Testing

1. **Health check:** Visit `https://your-deployed-server.com/health`
2. **Send a test SMS** to your OpenPhone number
3. **Check logs** in your deployment platform
4. **Verify response** is sent back via SMS

## Environment Variables Summary

### Frontend (.env for local development)
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENPHONE_API_KEY=your_openphone_api_key_here
VITE_OPENPHONE_PHONE_NUMBER=your_openphone_number_here
VITE_BUSINESS_NAME=Pink Chicken Speed Shop
VITE_LABOR_RATE=80
```

### Backend (Production environment variables)
```
OPENAI_API_KEY=your_openai_api_key_here
OPENPHONE_API_KEY=your_openphone_api_key_here
OPENPHONE_PHONE_NUMBER=your_openphone_number_here
BUSINESS_NAME=Pink Chicken Speed Shop
LABOR_RATE=80
DND_ENABLED=false
NODE_ENV=production
PORT=3001
```

## Architecture

```
Customer SMS → OpenPhone → Webhook Server → AI Processing → SMS Response
                    ↓
Frontend App ← Local Storage ← Message Display
```

The frontend and backend are now completely separate, allowing for independent scaling and deployment.