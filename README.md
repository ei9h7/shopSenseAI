# TorqueGPT - AI Service Advisor

An AI-powered service advisor application for solo mechanics, featuring automated message processing and customer communication.

## Features

- **AI-Powered Message Processing**: Automatically processes customer messages using OpenAI
- **OpenPhone Integration**: Receives and sends SMS messages via webhooks
- **Quote Generation**: AI generates service quotes based on customer inquiries
- **Do Not Disturb Mode**: Toggle automatic AI responses
- **Emergency Detection**: Prioritizes urgent messages
- **Dashboard**: Overview of messages, quotes, and business metrics

## Setup

### Prerequisites

- Node.js 18+ 
- OpenAI API key
- OpenPhone API key and phone number

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

This will start both the React client (port 5173) and the webhook server (port 3001).

### OpenPhone Webhook Setup

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