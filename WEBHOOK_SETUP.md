# Webhook Setup Guide - Receive SMS/WhatsApp Messages

This guide explains how to set up webhooks so drivers can **receive and respond** to booking notifications via SMS/WhatsApp on their actual phone numbers.

## ✅ What's Already Implemented

1. **Webhook Endpoints Created:**
   - `/api/webhook/twilio/sms` - Receives SMS from Twilio
   - `/api/webhook/whatsapp` - Receives WhatsApp messages

2. **Automatic Processing:**
   - Detects "accept" or "decline" keywords in messages
   - Updates booking status in Firestore
   - Sends notifications to customers

## 🔧 Setup Instructions

### Option 1: Twilio SMS Webhook

#### Step 1: Get Your Webhook URL

Your webhook URL will be:
```
https://yourdomain.com/api/webhook/twilio/sms
```

For local testing, use a tool like **ngrok**:
```bash
ngrok http 5000
```
This gives you a public URL like: `https://abc123.ngrok.io`

#### Step 2: Configure Twilio

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your Twilio phone number
4. Scroll to **Messaging Configuration**
5. Set **Webhook URL** to: `https://yourdomain.com/api/webhook/twilio/sms`
6. Set **HTTP Method** to: `POST`
7. Click **Save**

#### Step 3: Test

Send an SMS to your Twilio number with:
- "accept" or "yes" or "1" → Accepts booking
- "decline" or "no" or "cancel" or "2" → Declines booking

### Option 2: WhatsApp Business API Webhook

#### Step 1: Set Verify Token

Add to your `.env` file:
```env
WHATSAPP_VERIFY_TOKEN=your_secret_verify_token_here
```

#### Step 2: Configure Webhook in Facebook

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your WhatsApp Business App
3. Go to **WhatsApp** → **Configuration**
4. Click **Edit** next to **Webhook**
5. Set **Callback URL**: `https://yourdomain.com/api/webhook/whatsapp`
6. Set **Verify Token**: (same as in .env file)
7. Click **Verify and Save**

#### Step 3: Subscribe to Webhook Fields

1. In the same page, click **Manage** next to **Webhook fields**
2. Subscribe to: `messages`
3. Click **Save**

#### Step 4: Test

Send a WhatsApp message to your business number with:
- "accept" or "yes" or "1" → Accepts booking
- "decline" or "no" or "cancel" or "2" → Declines booking

## 📱 How It Works

### When Driver Receives SMS/WhatsApp:

1. **Driver gets notification** with booking details and Accept/Decline links
2. **Driver responds** via SMS/WhatsApp:
   - Types "accept" or "yes" or "1"
   - OR clicks the Accept link in the message
3. **Webhook receives message** → Processes response
4. **Booking status updated** in Firestore
5. **Customer notified** via in-app notification

### Message Processing:

The system automatically detects:
- ✅ **Accept keywords:** accept, yes, ok, 1
- ❌ **Decline keywords:** decline, no, cancel, 2

## 🧪 Testing Locally

### Using ngrok (Recommended):

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   # or download from https://ngrok.com
   ```

2. **Start your server:**
   ```bash
   npm run dev
   ```

3. **Start ngrok:**
   ```bash
   ngrok http 5000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Configure webhook** in Twilio/WhatsApp with:
   ```
   https://abc123.ngrok.io/api/webhook/twilio/sms
   ```

6. **Test** by sending SMS/WhatsApp to your number

## 🔍 Debugging

### Check Webhook Logs:

When a message is received, you'll see in server console:
```
📨 Incoming SMS from Twilio:
From: +94771234567
To: +1234567890
Message: accept
✅ Driver +94771234567 accepted booking abc123
```

### Common Issues:

1. **Webhook not receiving messages:**
   - Check webhook URL is correct
   - Verify server is running and accessible
   - Check firewall/security settings

2. **Messages not processed:**
   - Check phone number format matches database
   - Verify booking exists and is pending
   - Check server logs for errors

3. **Booking not updating:**
   - Verify Firestore rules allow updates
   - Check database connection
   - Verify booking ID is correct

## 📋 Phone Number Format

The system automatically formats phone numbers:
- Input: `0771234567` or `+94771234567`
- Stored: `+94771234567` (Sri Lanka format)
- Matching: Handles both formats

## 🔐 Security

1. **Verify Token:** Required for WhatsApp webhooks
2. **HTTPS:** Required for production webhooks
3. **IP Whitelist:** Optional - can restrict to Twilio/Facebook IPs

## 🚀 Production Deployment

1. **Deploy server** to hosting (Heroku, AWS, etc.)
2. **Get public URL** (e.g., `https://api.yoursite.com`)
3. **Configure webhooks** with production URL
4. **Test** with real phone numbers
5. **Monitor** server logs for incoming messages

## ✅ Checklist

- [ ] Webhook endpoints created
- [ ] Twilio webhook configured (if using SMS)
- [ ] WhatsApp webhook configured (if using WhatsApp)
- [ ] Verify token set (for WhatsApp)
- [ ] Tested with ngrok (local)
- [ ] Tested with production URL
- [ ] Phone number format verified
- [ ] Firestore rules allow updates
- [ ] Notifications working

## 🎯 Next Steps

1. Set up webhook URLs in Twilio/WhatsApp
2. Test with a real phone number
3. Verify booking status updates
4. Check customer notifications work

Your messaging system is now **two-way** - drivers can receive AND respond! 🎉

