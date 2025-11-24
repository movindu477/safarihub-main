/**
 * Example API endpoints for sending SMS with Accept/Decline buttons
 * 
 * To use these endpoints:
 * 1. Install required packages: npm install twilio (for Twilio) or set up WhatsApp Business API
 * 2. Add your credentials to environment variables
 * 3. Uncomment and configure the appropriate endpoint
 * 4. Update the sendBookingSMS function in App.jsx to call these endpoints
 */

// ============================================
// Option 1: Twilio SMS with Interactive Buttons (RCS/MMS)
// ============================================
/*
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, message, acceptUrl, declineUrl, viewUrl } = req.body;

  try {
    // For RCS (Rich Communication Services) with interactive buttons
    const messageBody = await client.messages.create({
      to: to,
      from: twilioPhoneNumber,
      body: message,
      // For RCS/MMS with interactive buttons:
      contentSid: 'your_content_sid', // Create content template in Twilio Console
      // Or use Twilio's Content API for interactive messages
    });

    // Alternative: Send SMS with clickable links
    const smsMessage = `${message}\n\n✅ Accept: ${acceptUrl}\n❌ Decline: ${declineUrl}`;
    
    const sms = await client.messages.create({
      to: to,
      from: twilioPhoneNumber,
      body: smsMessage,
    });

    res.status(200).json({ 
      success: true, 
      messageSid: sms.sid,
      acceptUrl,
      declineUrl,
      viewUrl
    });
  } catch (error) {
    console.error('Twilio error:', error);
    res.status(500).json({ error: 'Failed to send SMS', details: error.message });
  }
}
*/

// ============================================
// Option 2: WhatsApp Business API with Interactive Buttons
// ============================================
/*
const axios = require('axios');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, customerName, dates, totalPrice, acceptUrl, declineUrl, viewUrl } = req.body;

  try {
    // Format phone number (remove + and ensure it's international format)
    const formattedPhone = to.replace(/\D/g, '');

    // WhatsApp Business API with interactive buttons
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: `🚗 New Booking Request!\n\n👤 Customer: ${customerName}\n📅 Dates: ${dates}\n💰 Total: LKR ${totalPrice.toLocaleString()}\n\nPlease respond:`
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: `accept_${bookingId}`,
                  title: '✅ Accept'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: `decline_${bookingId}`,
                  title: '❌ Decline'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: `view_${bookingId}`,
                  title: '📋 View Details'
                }
              }
            ]
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({ 
      success: true, 
      messageId: response.data.messages[0].id,
      acceptUrl,
      declineUrl,
      viewUrl
    });
  } catch (error) {
    console.error('WhatsApp API error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to send WhatsApp message', 
      details: error.response?.data || error.message 
    });
  }
}
*/

// ============================================
// Option 3: Simple SMS with Clickable Links (Universal)
// ============================================
/*
// This works with any SMS provider (Twilio, AWS SNS, etc.)
// The links will be clickable on most modern phones

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, message, acceptUrl, declineUrl, viewUrl } = req.body;

  try {
    // Create shortened URLs for SMS (optional but recommended)
    // You can use services like bit.ly, tinyurl, or your own URL shortener
    const shortAcceptUrl = await shortenUrl(acceptUrl);
    const shortDeclineUrl = await shortenUrl(declineUrl);
    const shortViewUrl = await shortenUrl(viewUrl);

    // Format message with clickable links
    const smsMessage = `${message}\n\n✅ Accept: ${shortAcceptUrl}\n❌ Decline: ${shortDeclineUrl}\n📋 View: ${shortViewUrl}`;

    // Send via your SMS provider
    // Example with Twilio:
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: smsMessage
    });

    res.status(200).json({ 
      success: true, 
      messageSid: result.sid,
      acceptUrl: shortAcceptUrl,
      declineUrl: shortDeclineUrl,
      viewUrl: shortViewUrl
    });
  } catch (error) {
    console.error('SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS', details: error.message });
  }
}

async function shortenUrl(url) {
  // Implement URL shortening (bit.ly, tinyurl, etc.)
  // For now, return original URL
  return url;
}
*/

// ============================================
// Setup Instructions:
// ============================================
/*
1. TWILIO SETUP:
   - Sign up at https://www.twilio.com
   - Get Account SID and Auth Token
   - Get a phone number
   - Add to .env:
     TWILIO_ACCOUNT_SID=your_account_sid
     TWILIO_AUTH_TOKEN=your_auth_token
     TWILIO_PHONE_NUMBER=+1234567890

2. WHATSAPP BUSINESS API SETUP:
   - Create Facebook Business account
   - Set up WhatsApp Business API
   - Get Phone Number ID and Access Token
   - Add to .env:
     WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
     WHATSAPP_ACCESS_TOKEN=your_access_token

3. UPDATE App.jsx:
   - Uncomment the fetch call in sendBookingSMS function
   - Update the endpoint URL to match your API route
   - Test with a real phone number
*/

