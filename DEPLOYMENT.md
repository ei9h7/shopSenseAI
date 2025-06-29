# TorqueSheetGPT Deployment Guide

> **Built with [Bolt.new](https://bolt.new)** ⚡

This guide covers the complete deployment process for TorqueSheetGPT's production architecture.

## 🏗️ Current Deployment Status

### ✅ **Production Deployments**
- **Frontend**: https://clinquant-starship-25fe89.netlify.app (Netlify)
- **Backend**: https://torquegpt.onrender.com (Render)
- **Webhook URL**: https://torquegpt.onrender.com/api/webhooks/openphone

### 🔄 **Auto-Deployment**
- **Frontend**: Auto-deploys from `main` branch on GitHub
- **Backend**: Auto-deploys from `server/` directory on GitHub
- **Environment**: Production-ready with persistent API keys

## 🚀 Complete Deployment Process

### 1. **Backend Deployment (Render)**

#### **Step 1: Prepare Repository**
```bash
# Ensure your repository has the server directory
git add server/
git commit -m "Add webhook server"
git push origin main
```

#### **Step 2: Create Render Service**
1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure service:
   - **Name**: `torquegpt-webhook`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier is sufficient

#### **Step 3: Environment Variables**
Add these environment variables in Render dashboard:

```env
# Required API Keys
OPENAI_API_KEY=sk-your_actual_openai_key_here
OPENPHONE_API_KEY=your_actual_openphone_key_here
OPENPHONE_PHONE_NUMBER=+1234567890

# Business Configuration
BUSINESS_NAME=Pink Chicken Speed Shop
LABOR_RATE=80
DND_ENABLED=true

# Server Configuration
NODE_ENV=production
PORT=10000
```

#### **Step 4: Deploy**
1. Click **"Create Web Service"**
2. Render will automatically build and deploy
3. Note your service URL: `https://your-app-name.onrender.com`

#### **Step 5: Verify Deployment**
```bash
# Test health endpoint
curl https://your-app-name.onrender.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "environment": "production"
}
```

### 2. **Frontend Deployment (Netlify)**

#### **Step 1: Prepare Frontend**
```bash
# Ensure build works locally
npm install
npm run build

# Verify dist/ directory is created
ls dist/
```

#### **Step 2: Create Netlify Site**
1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository
4. Configure build:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Node Version**: 18 (in Environment Variables)

#### **Step 3: Deploy**
1. Click **"Deploy site"**
2. Netlify will build and deploy automatically
3. Note your site URL: `https://random-name.netlify.app`

#### **Step 4: Custom Domain (Optional)**
1. Go to **Site Settings** → **Domain Management**
2. Add custom domain if desired
3. Configure DNS settings as instructed

### 3. **OpenPhone Webhook Configuration**

#### **Step 1: Access OpenPhone Dashboard**
1. Go to [app.openphone.com](https://app.openphone.com)
2. Navigate to **Settings** → **Webhooks**

#### **Step 2: Add Webhook**
1. Click **"Add Webhook"**
2. Configure webhook:
   - **URL**: `https://your-render-app.onrender.com/api/webhooks/openphone`
   - **Events**: Select **"Message Received"**
   - **Description**: `TorqueSheetGPT Message Processing`

#### **Step 3: Test Webhook**
1. Save the webhook configuration
2. Send a test SMS to your OpenPhone number
3. Check Render logs for webhook processing
4. Verify AI response is sent back

## 🔧 Configuration Management

### **Server Environment Variables**

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI processing | ✅ | `sk-proj-...` |
| `OPENPHONE_API_KEY` | OpenPhone API key for SMS | ✅ | `op_live_...` |
| `OPENPHONE_PHONE_NUMBER` | Your OpenPhone number | ✅ | `+1234567890` |
| `BUSINESS_NAME` | Your business name | ❌ | `Pink Chicken Speed Shop` |
| `LABOR_RATE` | Hourly labor rate | ❌ | `80` |
| `DND_ENABLED` | Default DND setting | ❌ | `true` |
| `NODE_ENV` | Environment mode | ❌ | `production` |
| `PORT` | Server port (auto-set by Render) | ❌ | `10000` |

### **Frontend Configuration**
The frontend automatically connects to the production API at `https://torquegpt.onrender.com`. No environment variables needed.

## 📊 Monitoring & Health Checks

### **Server Health Monitoring**

#### **Health Check Endpoint**
```bash
curl https://torquegpt.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

#### **Settings API Endpoint**
```bash
curl https://torquegpt.onrender.com/api/settings
```

**Expected Response:**
```json
{
  "openai_configured": true,
  "openphone_configured": true,
  "business_name": "Pink Chicken Speed Shop",
  "labor_rate": 80,
  "dnd_enabled": true,
  "openai_key_preview": "••••••••1234",
  "openphone_key_preview": "••••••••5678"
}
```

### **Webhook Testing**

#### **Manual Webhook Test**
```bash
curl -X POST https://torquegpt.onrender.com/api/webhooks/openphone \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_123",
    "object": "event",
    "type": "message.received",
    "data": {
      "object": {
        "id": "msg_test",
        "object": "message",
        "from": "+1234567890",
        "to": "+0987654321",
        "direction": "incoming",
        "body": "Test message for webhook",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    }
  }'
```

#### **Real SMS Test**
1. Send SMS to your OpenPhone number: `"Hello, I need a quote for an oil change"`
2. Check Render logs for processing
3. Verify AI response received via SMS
4. Check frontend Messages page for conversation

## 🚨 Troubleshooting Guide

### **Common Deployment Issues**

#### **1. Render Build Fails**
```bash
# Check build logs in Render dashboard
# Common issues:
- Missing package.json in server/ directory
- Node.js version compatibility
- TypeScript compilation errors

# Solutions:
- Ensure server/package.json exists
- Set Node.js version to 18+ in environment
- Fix TypeScript errors in server code
```

#### **2. Netlify Build Fails**
```bash
# Check build logs in Netlify dashboard
# Common issues:
- Missing dependencies in package.json
- TypeScript compilation errors
- Vite configuration issues

# Solutions:
- Ensure Tailwind CSS is in dependencies (not devDependencies)
- Run npm install locally first
- Fix TypeScript errors
- Ensure vite is in dependencies
```

#### **3. Webhook Not Working**
```bash
# Check Render logs for webhook requests
# Common issues:
- Incorrect webhook URL in OpenPhone
- Server not responding to POST requests
- Environment variables not set

# Solutions:
- Verify webhook URL: https://your-app.onrender.com/api/webhooks/openphone
- Check server health endpoint
- Verify all environment variables are set
```

#### **4. AI Not Responding**
```bash
# Check server logs for AI processing errors
# Common issues:
- Invalid OpenAI API key
- No OpenAI credits remaining
- API rate limits exceeded

# Solutions:
- Verify API key is valid and has credits
- Check OpenAI usage dashboard
- Fallback system should still provide responses
```

#### **5. SMS Not Sending**
```bash
# Check server logs for OpenPhone API errors
# Common issues:
- Invalid OpenPhone API key
- Incorrect phone number format
- API permissions issues

# Solutions:
- Verify API key in OpenPhone dashboard
- Ensure phone number includes country code (+1)
- Check API key permissions for SMS sending
```

#### **6. Tech Sheet Generation Failing**
```bash
# Check browser console for errors
# Common issues:
- OpenAI API key not configured
- Rate limits or no credits
- Network connectivity issues

# Solutions:
- Configure OpenAI API key in settings
- Check API usage and credits
- Try with simpler job descriptions
- Check browser network tab for errors
```

### **Performance Optimization**

#### **Server Performance**
- **Instance Type**: Free tier sufficient for moderate usage
- **Scaling**: Upgrade to paid tier for high volume
- **Monitoring**: Use Render metrics dashboard
- **Logs**: Monitor response times and error rates

#### **Frontend Performance**
- **CDN**: Netlify provides global CDN automatically
- **Caching**: Static assets cached automatically
- **Bundle Size**: Optimized with Vite tree-shaking
- **Loading**: Lazy loading for better performance

#### **API Optimization**
- **Rate Limiting**: Implement if needed for high volume
- **Caching**: Consider Redis for message caching
- **Database**: Add persistent storage for high volume
- **Monitoring**: Use external monitoring service

## 🔐 Security Best Practices

### **API Key Security**
- ✅ Store keys as environment variables only
- ✅ Never commit keys to version control
- ✅ Use masked display in frontend
- ✅ Rotate keys regularly
- ✅ Monitor for unauthorized usage

### **Webhook Security**
- ✅ Use HTTPS for all webhook URLs
- ✅ Validate webhook payloads
- ✅ Implement request signing (future enhancement)
- ✅ Monitor for suspicious activity
- ✅ Rate limiting if needed

### **Data Privacy**
- ✅ Minimal data retention
- ✅ Secure transmission (HTTPS)
- ✅ No persistent customer data
- ✅ Temporary message storage only
- ✅ GDPR compliance ready

## 📈 Success Metrics

### **Deployment Success Checklist**
- [ ] Server health check returns 200 OK
- [ ] Settings API shows all keys configured
- [ ] Webhook receives test messages
- [ ] AI processes messages successfully
- [ ] SMS responses sent successfully
- [ ] Frontend loads and connects to API
- [ ] Settings page shows server configuration
- [ ] Emergency messages trigger alerts
- [ ] Fallback system works when AI unavailable
- [ ] Tech sheet generation works
- [ ] Quote acceptance generates tech sheets

### **Operational Metrics**
- **Response Time**: < 5 seconds for AI processing
- **Uptime**: > 99% server availability
- **Success Rate**: > 95% message processing success
- **Fallback Rate**: < 10% fallback usage
- **Customer Satisfaction**: No missed messages

## 🎯 Next Steps

### **Post-Deployment**
1. **Monitor Logs**: Watch Render logs for first 24 hours
2. **Test Thoroughly**: Send various message types
3. **Train Team**: Ensure team knows how to use system
4. **Document**: Keep deployment details for future reference
5. **Backup**: Export environment variables securely

### **Future Enhancements**
- **Database Integration**: Add PostgreSQL for message persistence
- **Analytics Dashboard**: Track message volume and response rates
- **Multi-Language**: Support for multiple languages
- **Advanced AI**: Custom fine-tuned models
- **Mobile App**: Native mobile application
- **Calendar Integration**: Appointment scheduling
- **Invoice Generation**: Automated billing

---

**TorqueSheetGPT** is now successfully deployed and ready to handle customer messages 24/7! 🚗⚡

Built with [Bolt.new](https://bolt.new) - The future of AI-powered development.