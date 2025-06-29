# TorqueSheetGPT Webhook Server

This is the standalone webhook server for TorqueSheetGPT that handles OpenPhone webhooks and processes messages with AI.

## Quick Start

### Local Development

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENPHONE_API_KEY=your_openphone_api_key_here
   OPENPHONE_PHONE_NUMBER=your_openphone_number_here
   BUSINESS_NAME=Pink Chicken Speed Shop
   LABOR_RATE=80
   DND_ENABLED=false
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```
   Server will run on http://localhost:3001

### Production Build

```bash
npm run build
npm start
```

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

### Render (Free Tier Available)

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set root directory to `server`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add environment variables in Render dashboard

### Heroku

1. Install Heroku CLI
2. Create new app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set OPENAI_API_KEY=your_key`
4. Deploy: `git push heroku main`

## API Endpoints

- **Health Check**: `GET /health`
- **Webhook**: `POST /api/webhooks/openphone`
- **Root**: `GET /` (API info)

## Features

- **Graceful AI Fallback**: When OpenAI credits run out, uses intelligent fallback responses
- **Emergency Detection**: Automatically detects and prioritizes urgent messages
- **Do Not Disturb Mode**: Toggle automatic responses on/off
- **Comprehensive Logging**: Detailed logs for debugging and monitoring

## Health Check

Your deployed server will have a health check endpoint at:
`https://your-domain.com/health`

## Webhook Testing

You can test your webhook locally using ngrok:

1. Install ngrok: `npm install -g ngrok`
2. Run your server: `npm run dev`
3. In another terminal: `ngrok http 3001`
4. Use the ngrok URL for your OpenPhone webhook

## Troubleshooting

### Common Issues

1. **Build fails**: Check TypeScript compilation errors
2. **Webhook not working**: Verify OpenPhone webhook URL
3. **AI not responding**: Check OpenAI API key and credits
4. **SMS not sending**: Verify OpenPhone API key and phone number

### Logs

Check your deployment platform's logs for detailed error information:
- Railway: View logs in Railway dashboard
- Render: Check logs in Render dashboard
- Heroku: Use `heroku logs --tail`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI processing | Yes |
| `OPENPHONE_API_KEY` | OpenPhone API key for SMS | Yes |
| `OPENPHONE_PHONE_NUMBER` | Your OpenPhone number | Yes |
| `BUSINESS_NAME` | Your business name | No |
| `LABOR_RATE` | Hourly labor rate | No |
| `DND_ENABLED` | Enable/disable auto-responses | No |
| `NODE_ENV` | Environment (production/development) | No |
| `PORT` | Server port (auto-set by most platforms) | No |