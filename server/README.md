# TorqueGPT Webhook Server

This is the standalone webhook server for TorqueGPT that handles OpenPhone webhooks and processes messages with AI.

## Deployment on Railway

### 1. Prepare for Deployment

1. Create a Railway account at [railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`

### 2. Deploy

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Initialize Railway project:
   ```bash
   railway init
   ```

3. Deploy:
   ```bash
   railway up
   ```

### 3. Set Environment Variables

In your Railway dashboard, add these environment variables:

```
OPENAI_API_KEY=your_openai_api_key_here
OPENPHONE_API_KEY=your_openphone_api_key_here
OPENPHONE_PHONE_NUMBER=your_openphone_number_here
BUSINESS_NAME=Pink Chicken Speed Shop
LABOR_RATE=80
DND_ENABLED=false
NODE_ENV=production
```

### 4. Get Your Webhook URL

After deployment, Railway will provide you with a URL like:
`https://your-app-name.railway.app`

Your webhook URL will be:
`https://your-app-name.railway.app/api/webhooks/openphone`

### 5. Configure OpenPhone

1. Go to your OpenPhone dashboard
2. Navigate to Settings → Webhooks
3. Add a new webhook with your Railway URL
4. Select "Message Received" as the trigger event
5. Save the configuration

## Alternative Deployment Options

### Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables in Render dashboard

### Heroku

1. Install Heroku CLI
2. Create new app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set OPENAI_API_KEY=your_key`
4. Deploy: `git push heroku main`

## Local Development

1. Copy `.env.example` to `.env`
2. Fill in your API keys
3. Run: `npm run dev`

## Health Check

Your deployed server will have a health check endpoint at:
`https://your-domain.com/health`

## Webhook Testing

You can test your webhook locally using ngrok:

1. Install ngrok: `npm install -g ngrok`
2. Run your server: `npm run dev`
3. In another terminal: `ngrok http 3001`
4. Use the ngrok URL for your OpenPhone webhook