# Quick Start Guide

## 🚀 Starting the Application

The server now starts **automatically** when you run the development command!

### Development Mode (Frontend + Backend)

Simply run:
```bash
npm run dev
```

This will automatically start:
- ✅ **Frontend** (Vite) on `http://localhost:5173`
- ✅ **Backend** (Express API) on `http://localhost:5000`

You'll see both running in the same terminal with colored output:
- `[frontend]` - Frontend logs (cyan)
- `[backend]` - Backend logs (yellow)

### Alternative Commands

**Frontend only:**
```bash
npm run dev:frontend
```

**Backend only:**
```bash
npm run dev:backend
# or
npm run server
```

**Both (alternative):**
```bash
npm run dev:full
```

## 📱 What Happens When You Start

1. **Frontend starts** → React app loads at `http://localhost:5173`
2. **Backend starts** → API server runs at `http://localhost:5000`
3. **SMS/WhatsApp API ready** → `/api/send-booking-notification` endpoint available

## ✅ Testing

1. Open `http://localhost:5173` in your browser
2. Create a booking
3. Check terminal - you should see backend logs showing SMS notification sent

## 🔧 Troubleshooting

### Port Already in Use

If you see "port already in use" error:

**For Frontend (5173):**
- Change port in `vite.config.js`:
  ```js
  server: {
    port: 3000, // or any other port
  }
  ```

**For Backend (5000):**
- Set environment variable:
  ```bash
  PORT=5001 npm run dev
  ```

### Server Not Starting

1. Check if `concurrently` is installed:
   ```bash
   npm install
   ```

2. Check if port 5000 is available:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # Mac/Linux
   lsof -i :5000
   ```

### API Not Working

1. Check backend is running (look for `[backend]` logs)
2. Test API health:
   ```bash
   curl http://localhost:5000/api/health
   ```
3. Check browser console for API errors

## 📝 Environment Variables (Optional)

Create `.env` file for SMS providers:

```env
# Twilio (optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Business API (optional)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

**Note:** Without these, the system will use WhatsApp link fallback (still works!)

## 🎯 Production

For production deployment:

1. **Build frontend:**
   ```bash
   npm run build
   ```

2. **Start server:**
   ```bash
   npm start
   ```

The server will serve the built frontend from the `dist` folder.

## ✨ That's It!

Just run `npm run dev` and everything starts automatically! 🎉

