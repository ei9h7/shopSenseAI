# Render Deployment Fix Guide

## Issue: SIGTERM Error on Render

The server was getting terminated with SIGTERM signal. Here's what was fixed:

### 1. **Server Binding Fix**
```javascript
// OLD: app.listen(PORT)
// NEW: app.listen(PORT, '0.0.0.0')
```
Render requires binding to `0.0.0.0` instead of localhost.

### 2. **Graceful Shutdown Handling**
```javascript
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  process.exit(0)
})
```

### 3. **Health Check Optimization**
- Added uptime and memory info to health endpoint
- Ensured quick response times for Render health checks

### 4. **Build Process Fix**
```json
{
  "scripts": {
    "postinstall": "npm run build"
  }
}
```
Added automatic build after npm install.

### 5. **Resource Limits**
- Added request size limits to prevent memory issues
- Optimized for Render's free tier constraints

## Deployment Steps

1. **Push these changes to GitHub**
2. **Render will auto-deploy from the server/ directory**
3. **Check deployment logs in Render dashboard**
4. **Verify health endpoint**: https://torquegpt.onrender.com/health

## Environment Variables Required

Make sure these are set in Render dashboard:

```
OPENAI_API_KEY=your_actual_key
OPENPHONE_API_KEY=your_actual_key  
OPENPHONE_PHONE_NUMBER=+1234567890
BUSINESS_NAME=Pink Chicken Speed Shop
LABOR_RATE=80
DND_ENABLED=true
NODE_ENV=production
```

## Testing After Deployment

1. **Health Check**: `curl https://torquegpt.onrender.com/health`
2. **Settings API**: `curl https://torquegpt.onrender.com/api/settings`
3. **Send test SMS** to your OpenPhone number
4. **Check Render logs** for message processing

## Common Issues & Solutions

### Server Still Getting SIGTERM
- Check if all environment variables are set
- Verify the health endpoint responds quickly
- Monitor memory usage in Render dashboard

### Build Failures
- Ensure TypeScript compiles without errors
- Check that all dependencies are in package.json
- Verify Node.js version compatibility

### Webhook Not Working
- Confirm OpenPhone webhook URL is correct
- Check that environment variables are set
- Test health endpoint accessibility

## Success Indicators

✅ Server starts without SIGTERM errors
✅ Health endpoint returns 200 OK
✅ Settings API shows configured keys
✅ Webhook processes test messages
✅ AI responses are sent via SMS

The server should now run stably on Render's free tier!