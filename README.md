# TorqueSheetGPT - AI Service Advisor

An AI-powered service advisor application for solo mechanics, featuring automated message processing and customer communication.

## Features

- **AI-Powered Message Processing**: Automatically processes customer messages using OpenAI
- **OpenPhone Integration**: Receives and sends SMS messages via webhooks
- **Quote Generation**: AI generates service quotes based on customer inquiries
- **Do Not Disturb Mode**: Toggle automatic AI responses
- **Emergency Detection**: Prioritizes urgent messages
- **Dashboard**: Overview of messages, quotes, and business metrics

## Quick Start

### Prerequisites

- Node.js 18+ 
- OpenAI API key
- OpenPhone API key and phone number

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd torquesheetgpt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your API keys:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_OPENPHONE_API_KEY=your_openphone_api_key_here
   VITE_OPENPHONE_PHONE_NUMBER=your_openphone_number_here
   VITE_BUSINESS_NAME=Pink Chicken Speed Shop
   VITE_LABOR_RATE=80
   ```

4. **Set up server environment**
   ```bash
   cd server
   cp .env.example .env
   ```
   Edit `server/.env` with your production keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENPHONE_API_KEY=your_openphone_api_key_here
   OPENPHONE_PHONE_NUMBER=your_openphone_number_here
   BUSINESS_NAME=Pink Chicken Speed Shop
   LABOR_RATE=80
   DND_ENABLED=false
   ```

5. **Start the application**
   ```bash
   # From the root directory
   npm run dev
   ```
   This starts both the React client (port 5173) and the webhook server (port 3001).

### Alternative Start Commands

- **Frontend only**: `npm run dev:client`
- **Server only**: `npm run dev:server`
- **Production build**: `npm run build`

## OpenPhone Webhook Setup

1. Go to your OpenPhone dashboard
2. Navigate to Settings → Webhooks
3. Add a new webhook with URL: `http://localhost:3001/api/webhooks/openphone`
4. Select "Message Received" as the trigger event
5. Save the webhook configuration

For production, replace `localhost:3001` with your deployed webhook server URL.

## Development

- `npm run dev` - Start both client and webhook server
- `npm run dev:client` - Start only the React client
- `npm run dev:server` - Start only the webhook server
- `npm run build` - Build for production

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express.js webhook server
- **Storage**: LocalStorage (for development)
- **AI**: OpenAI GPT-4
- **SMS**: OpenPhone API

## Webhook Flow

1. Customer sends SMS to your OpenPhone number
2. OpenPhone sends webhook to `/api/webhooks/openphone`
3. Webhook processes message and stores it
4. If Do Not Disturb is enabled, AI generates response
5. Response is sent back via OpenPhone API
6. Both messages are stored and displayed in the UI

## Deployment

See `DEPLOYMENT.md` for detailed deployment instructions for both frontend and backend components.

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**: Check OpenPhone webhook URL configuration
2. **AI not responding**: Verify OpenAI API key and credits
3. **SMS not sending**: Check OpenPhone API key and phone number
4. **Server not starting**: Ensure all environment variables are set

### Health Checks

- Frontend: http://localhost:5173
- Webhook server: http://localhost:3001/health

For more help, check the logs in your terminal or browser console.