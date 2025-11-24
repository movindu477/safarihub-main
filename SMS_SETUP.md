# SMS Booking Confirmation Setup Guide

This guide explains how to set up SMS notifications with Accept/Decline buttons for booking confirmations.

## Current Implementation

The system currently sends booking notifications via **WhatsApp links** (opens in browser). The SMS includes:
- Booking details (customer name, dates, total price)
- **Accept button** - Direct link to accept the booking
- **Decline button** - Direct link to decline the booking
- **View Details** - Link to full booking page

## How It Works

1. **Customer creates booking** → Booking saved to Firestore
2. **SMS sent to driver** → Contains booking details + action links
3. **Driver clicks Accept/Decline** → Direct action via URL
4. **Booking status updated** → Both parties notified

## SMS Message Format

```
🚗 New Booking Request!

👤 Customer: John Doe
📅 Dates: Jan 15, 2024, Jan 16, 2024
💰 Total: LKR 15,000

✅ ACCEPT: https://yoursite.com/booking-action/abc123/accept
❌ DECLINE: https://yoursite.com/booking-action/abc123/decline

📋 View: https://yoursite.com/booking-confirm/abc123
```

## Setup Options

### Option 1: WhatsApp Business API (Recommended for Interactive Buttons)

**Pros:**
- Native interactive buttons in WhatsApp
- Better user experience
- Free for low volume

**Setup:**
1. Create Facebook Business account
2. Set up WhatsApp Business API
3. Get Phone Number ID and Access Token
4. Update `api/send-sms-example.js` with WhatsApp code
5. Uncomment WhatsApp API call in `App.jsx`

**Cost:** Free for first 1,000 conversations/month

### Option 2: Twilio SMS/RCS

**Pros:**
- Works with regular SMS
- RCS supports interactive buttons (limited carriers)
- Reliable delivery

**Setup:**
1. Sign up at [Twilio](https://www.twilio.com)
2. Get Account SID, Auth Token, and Phone Number
3. Update `api/send-sms-example.js` with Twilio code
4. Uncomment Twilio API call in `App.jsx`

**Cost:** ~$0.0075 per SMS (varies by country)

### Option 3: AWS SNS

**Pros:**
- Scalable
- Good for high volume
- Multiple regions

**Setup:**
1. Set up AWS account
2. Configure SNS
3. Create API endpoint
4. Update `App.jsx` to call AWS endpoint

**Cost:** ~$0.00645 per SMS (varies by region)

### Option 4: Current Implementation (WhatsApp Link)

**Pros:**
- No setup required
- Works immediately
- Free

**Cons:**
- Opens in browser
- Requires internet connection
- Not true SMS

## Implementation Steps

### Step 1: Choose Your SMS Provider

Select one of the options above based on your needs.

### Step 2: Set Up Environment Variables

Create `.env.local` file:

```env
# For Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# For WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

### Step 3: Create API Endpoint

1. Copy code from `api/send-sms-example.js`
2. Create your API route (e.g., `pages/api/send-sms.js` or `api/send-sms.js`)
3. Uncomment and configure the appropriate provider code

### Step 4: Update App.jsx

In `src/App.jsx`, update the `sendBookingSMS` function:

```javascript
// Uncomment the API call for your chosen provider:
await fetch('/api/send-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: `+${formattedPhone}`,
    message: message,
    acceptUrl: acceptUrl,
    declineUrl: declineUrl,
    viewUrl: viewUrl,
    customerName: customerName,
    dates: dates,
    totalPrice: totalPrice
  })
});
```

### Step 5: Test

1. Create a test booking
2. Verify SMS is received
3. Test Accept/Decline buttons
4. Verify booking status updates

## URL Shortening (Optional)

For SMS character limits, consider URL shortening:

```javascript
// Example with bit.ly API
const shortUrl = await fetch('https://api-ssl.bitly.com/v4/shorten', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${BITLY_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    long_url: acceptUrl
  })
});
```

## Security Considerations

1. **Authentication**: Booking action URLs require driver authentication
2. **Authorization**: Only the driver can accept/decline their bookings
3. **Rate Limiting**: Implement rate limiting on API endpoints
4. **Validation**: Validate all inputs before processing

## Testing

### Test Scenarios:
1. ✅ Accept booking via SMS link
2. ✅ Decline booking via SMS link
3. ✅ View booking details via SMS link
4. ✅ Unauthorized access attempt
5. ✅ Already processed booking
6. ✅ Invalid booking ID

### Test Phone Numbers:
- Use Twilio test numbers for development
- Use real numbers for production testing

## Troubleshooting

### SMS Not Received:
- Check phone number format (must include country code)
- Verify API credentials
- Check SMS provider logs
- Test with different phone numbers

### Buttons Not Working:
- Verify URLs are accessible
- Check authentication requirements
- Test links in browser first
- Check Firestore security rules

### Booking Not Updating:
- Check Firestore security rules
- Verify user authentication
- Check console for errors
- Verify booking ID is correct

## Production Checklist

- [ ] SMS provider configured
- [ ] Environment variables set
- [ ] API endpoint deployed
- [ ] Firestore rules updated
- [ ] Authentication working
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Rate limiting enabled
- [ ] Tested with real numbers
- [ ] Monitoring set up

## Support

For issues or questions:
1. Check provider documentation
2. Review error logs
3. Test with simple SMS first
4. Verify all configurations

## Next Steps

1. Choose your SMS provider
2. Set up API endpoint
3. Configure environment variables
4. Test thoroughly
5. Deploy to production

---

**Note:** The current implementation uses WhatsApp links as a fallback. For production, integrate with a proper SMS provider for better reliability and user experience.

