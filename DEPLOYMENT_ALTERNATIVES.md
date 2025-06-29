# TorqueSheetGPT - Alternative Deployment Methods

Since Railway CLI installation failed in WebContainer, here are alternative deployment methods for the TorqueSheetGPT webhook server:

## Option 1: Railway Web Dashboard (Recommended)

1. **Go to [railway.app](https://railway.app) and sign up/login**
2. **Click "New Project" → "Deploy from GitHub repo"**
3. **Connect your GitHub account and select this repository**
4. **Set the root directory to `server`**
5. **Add environment variables in Railway dashboard:**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENPHONE_API_KEY=your_openphone_api_key_here
   OPENPHONE_PHONE_NUMBER=your_openphone_number_here
   BUSINESS_NAME=Pink Chicken Speed Shop
   LABOR_RATE=80
   DND_ENABLED=false
   NODE_ENV=production
   ```
6. **Deploy automatically triggers**
7. **Get your webhook URL from Railway dashboard**

## Option 2: Render (Free Tier Available)

1. **Go to [render.com](https://render.com) and sign up**
2. **Click "New" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure:**
   - Name: `torquesheetgpt-webhook`
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. **Add environment variables in Render dashboard**
6. **Deploy**

## Option 3: Vercel (Serverless)

1. **Go to [vercel.com](https://vercel.com) and sign up**
2. **Install Vercel CLI locally (not in WebContainer):**
   ```bash
   npm install -g vercel
   ```
3. **From your local machine, clone this repo and run:**
   ```bash
   cd server
   vercel
   ```
4. **Follow the prompts and add environment variables**

## Option 4: Heroku

1. **Go to [heroku.com](https://heroku.com) and create account**
2. **Create new app from dashboard**
3. **Connect to GitHub repository**
4. **Set root directory to `server` in settings**
5. **Add environment variables in Config Vars**
6. **Enable automatic deploys**

## Option 5: DigitalOcean App Platform

1. **Go to [digitalocean.com](https://digitalocean.com)**
2. **Create new App**
3. **Connect GitHub repository**
4. **Configure build settings for `server` directory**
5. **Add environment variables**
6. **Deploy**

## Recommended: Railway Web Dashboard

Railway is the easiest option for TorqueSheetGPT. Here's the step-by-step:

1. **Visit [railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose this repository**
6. **In project settings:**
   - Set root directory: `server`
   - Add all environment variables listed above
7. **Railway will automatically build and deploy**
8. **Copy the generated URL (something like `https://your-app.railway.app`)**
9. **Your webhook URL will be: `https://your-app.railway.app/api/webhooks/openphone`**

## Local Development Setup

Before deploying, test locally:

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd torquesheetgpt
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   cd server && cp .env.example .env && cd ..
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```
   This starts both frontend (port 5173) and webhook server (port 3001)

## After Deployment

1. **Test your webhook server:**
   ```bash
   curl https://your-deployed-url.com/health
   ```

2. **Configure OpenPhone webhook:**
   - Go to OpenPhone dashboard
   - Settings → Webhooks
   - Add webhook URL: `https://your-deployed-url.com/api/webhooks/openphone`
   - Select "Message Received" event
   - Save

3. **Test with a message to your OpenPhone number**

## Features of TorqueSheetGPT

- **Graceful AI Fallback**: When OpenAI credits run out, uses intelligent fallback responses
- **Emergency Detection**: Automatically detects and prioritizes urgent messages  
- **Do Not Disturb Mode**: Toggle automatic responses on/off
- **Comprehensive Logging**: Detailed logs for debugging and monitoring

Choose the deployment method that works best for you. Railway is recommended for its simplicity and Node.js optimization.