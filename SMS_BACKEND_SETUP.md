# SMS/WhatsApp Backend Setup Guide

The backend API now sends SMS/WhatsApp notifications to drivers when bookings are created. This guide explains how to set it up.

## How It Works

1. **Customer creates booking** → Frontend calls `/api/send-booking-notification`
2. **Backend API** → Sends SMS/WhatsApp via configured provider
3. **Driver receives notification** → With Accept/Decline links

## Setup Options

### Option 1: Twilio SMS (Recommended for Production)

**Pros:**
- Reliable SMS delivery
- Works worldwide
- Good documentation

**Setup:**
1. Sign up at https://www.twilio.com
2. Get Account SID and Auth Token from Console
3. Get a phone number
4. Install Twilio package:
   ```bash
   npm install twilio
   ```
5. Add to `.env` file:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

**Cost:** ~$0.0075 per SMS (varies by country)

### Option 2: WhatsApp Business API

**Pros:**
- Free for first 1,000 conversations/month
- Better user experience
- Supports interactive buttons

**Setup:**
1. Create Facebook Business account
2. Set up WhatsApp Business API
3. Get Phone Number ID and Access Token
4. Add to `.env` file:
   ```env
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   WHATSAPP_ACCESS_TOKEN=your_access_token
   ```

**Cost:** Free for first 1,000 conversations/month

### Option 3: WhatsApp Link (Fallback - No Setup)

**Pros:**
- No setup required
- Works immediately
- Free

**Cons:**
- Opens in browser
- Requires manual click

**Setup:** None required - works automatically if no providers configured

## Installation Steps

### Step 1: Install Dependencies

```bash
# For Twilio
npm install twilio

# For WhatsApp Business API (uses axios - already in dependencies)
# No additional install needed
```

### Step 2: Create .env File

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials.

### Step 3: Start Server

```bash
# Development (with frontend)
npm run dev:full

# Or just the server
npm run server
```

### Step 4: Test API

Check if API is working:

```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{
  "status": "ok",
  "smsProviders": {
    "twilio": true,
    "whatsapp": false
  }
}
```

## API Endpoint

### POST `/api/send-booking-notification`

**Request Body:**
```json
{
  "phoneNumber": "0771234567",
  "bookingId": "abc123",
  "customerName": "John Doe",
  "dates": "Jan 15, 2024, Jan 16, 2024",
  "totalPrice": 15000,
  "driverName": "Driver Name"
}
```

**Response:**
```json
{
  "success": true,
  "method": "twilio-sms",
  "messageSid": "SMxxxxxxxx",
  "to": "+94771234567"
}
```

## Message Format

The SMS/WhatsApp message includes:
- Customer name
- Booking dates
- Total price
- **Accept link** - Direct link to accept booking
- **Decline link** - Direct link to decline booking
- **View details link** - Full booking page

Example:
```
🚗 New Booking Request!

👤 Customer: John Doe
📅 Dates: Jan 15, 2024, Jan 16, 2024
💰 Total: LKR 15,000

✅ ACCEPT: https://yoursite.com/booking-action/abc123/accept
❌ DECLINE: https://yoursite.com/booking-action/abc123/decline

📋 View Details: https://yoursite.com/booking-confirm/abc123
```

## Testing

### Test with cURL:

```bash
curl -X POST http://localhost:5000/api/send-booking-notification \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "0771234567",
    "bookingId": "test123",
    "customerName": "Test Customer",
    "dates": "Jan 15, 2024",
    "totalPrice": 10000,
    "driverName": "Test Driver"
  }'
```

### Test from Frontend:

1. Create a booking in the app
2. Check server console for logs
3. Driver should receive SMS/WhatsApp

## Troubleshooting

### Error: "No SMS provider configured"
- **Fix:** Set up at least one provider (Twilio or WhatsApp) in `.env`

### Error: "Twilio error"
- **Fix:** Check your Twilio credentials are correct
- Verify phone number format is correct
- Check Twilio account has sufficient balance

### Error: "WhatsApp API error"
- **Fix:** Verify Phone Number ID and Access Token
- Check token hasn't expired
- Ensure WhatsApp Business API is properly set up

### SMS not received
- Check phone number format (should include country code)
- Verify provider credentials
- Check server logs for errors
- Test with a known working phone number

## Production Deployment

1. Set environment variables on your hosting platform
2. Ensure server is running and accessible
3. Update `VITE_API_URL` in frontend to point to your server
4. Test booking creation end-to-end

## Security Notes

- **Never commit `.env` file** to git
- Store credentials securely
- Use environment variables in production
- Rotate tokens regularly

## Support

For issues:
1. Check server logs
2. Verify environment variables
3. Test API endpoint directly
4. Check provider documentation

