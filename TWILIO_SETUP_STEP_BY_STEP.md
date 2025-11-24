# Twilio Webhook Setup - Step by Step Guide

## 🎯 Quick Setup (5 minutes)

### Step 1: Get Your Webhook URL

#### Option A: Production (Your Live Server)
```
https://yourdomain.com/api/webhook/twilio/sms
```

#### Option B: Local Testing (Using ngrok)

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   # Or install via npm:
   npm install -g ngrok
   ```

2. **Start your server:**
   ```bash
   npm run dev
   ```

3. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 5000
   ```

4. **Copy the HTTPS URL** (looks like: `https://abc123.ngrok.io`)

5. **Your webhook URL will be:**
   ```
   https://abc123.ngrok.io/api/webhook/twilio/sms
   ```

### Step 2: Configure in Twilio Console

1. **Go to:** https://www.twilio.com/console/phone-numbers/incoming

2. **Click on your phone number** (or buy one if you don't have one)

3. **Scroll down to "Messaging" section**

4. **Find "A MESSAGE COMES IN" field**

5. **Enter your webhook URL:**
   ```
   https://yourdomain.com/api/webhook/twilio/sms
   ```
   OR for local testing:
   ```
   https://abc123.ngrok.io/api/webhook/twilio/sms
   ```

6. **Select HTTP method:** `POST`

7. **Click "Save"** button at the bottom

### Step 3: Test It!

1. **Send an SMS** to your Twilio phone number

2. **Type one of these:**
   - "accept" or "yes" or "1" → Accepts booking
   - "decline" or "no" or "cancel" or "2" → Declines booking

3. **Check your server console** - you should see:
   ```
   📨 Incoming SMS from Twilio:
   From: +94771234567
   To: +1234567890
   Message: accept
   ✅ Driver +94771234567 accepted booking abc123
   ```

## 📸 Visual Guide

### In Twilio Console:

```
Phone Numbers → Manage → Active Numbers
    ↓
Click on your number
    ↓
Scroll to "Messaging Configuration"
    ↓
"A MESSAGE COMES IN" field:
    [https://yourdomain.com/api/webhook/twilio/sms]
    ↓
HTTP Method: [POST ▼]
    ↓
Click "Save"
```

## ✅ Verification Checklist

- [ ] Phone number selected in Twilio
- [ ] Webhook URL entered correctly
- [ ] HTTP method set to POST
- [ ] Changes saved
- [ ] Server is running
- [ ] ngrok running (if testing locally)
- [ ] Test SMS sent
- [ ] Server logs show incoming message

## 🔧 Troubleshooting

### Webhook not receiving messages?

1. **Check webhook URL is correct:**
   - Must be HTTPS (not HTTP)
   - Must end with `/api/webhook/twilio/sms`
   - No trailing slash

2. **Check server is running:**
   ```bash
   npm run dev
   ```

3. **Check ngrok is running** (if testing locally):
   ```bash
   ngrok http 5000
   ```

4. **Check Twilio logs:**
   - Go to Twilio Console → Monitor → Logs → Messaging
   - Look for webhook delivery attempts
   - Check for errors

### Getting 404 errors?

- Verify the webhook URL is correct
- Make sure server is running on port 5000
- Check ngrok URL hasn't changed (restart = new URL)

### Messages not processing?

- Check phone number format in database matches
- Verify booking exists and is pending
- Check server console for error messages

## 🎯 What Happens Next

Once configured:

1. **Driver receives SMS** with booking details
2. **Driver responds** with "accept" or "decline"
3. **Twilio sends message** to your webhook
4. **Your server processes** the response
5. **Booking status updates** automatically
6. **Customer gets notified** in the app

## 📝 Notes

- **ngrok URLs change** every time you restart (free tier)
- **For production**, use your actual domain
- **Webhook must be HTTPS** (Twilio requirement)
- **Test with real phone numbers** to verify

## 🚀 You're Done!

Once you've saved the webhook URL in Twilio, the system is ready to receive messages!

Try sending an SMS to your Twilio number and watch the magic happen! ✨

