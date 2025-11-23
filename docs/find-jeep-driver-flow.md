# Activity Diagram: Find Jeep Driver

## Overview
This document describes the activity flow for finding and contacting a jeep driver in the SafariHub platform.

## Process Flow

### 1. Initial Access
```
Tourist → Access SafariHub Platform
       → Navigate to "Safari Jeep Drivers" section
```

### 2. System Initialization
The system performs the following:
- Loads all service providers from Firebase Firestore
- Filters for providers where `serviceType === "Jeep Driver"`
- Displays initial list with online/offline status indicators
- Sets up real-time listeners for status updates

### 3. Filter Application (Optional)
Tourists can filter drivers by:

#### Basic Filters:
- **Destination**: Yala, Wilpattu, Udawalawe, Minneriya, Horton Plains, Sinharaja Forest
- **Rating**: 1★ to 5★
- **Price Range**: LKR 5,000 - 100,000 per day
- **Vehicle Type**: Standard, Luxury, Open Roof, 4x4 Modified

#### Advanced Filters:
- **Languages**: English, Sinhala, Tamil, Hindi, French, German, Chinese, Japanese
- **Special Skills**: Wildlife photography, Birdwatching, Family-friendly, Private tours, etc.
- **Certifications**: Wildlife Department, Tourism Board, First Aid, Eco Tourism, etc.

### 4. Browse Driver Listings
Each driver card displays:
- Driver name and profile photo
- Real-time online/offline status
- Location (base city)
- Star rating (0-5 stars)
- Price per day (LKR)
- Years of experience
- Vehicle type
- Destinations covered
- Languages spoken
- Special services offered

### 5. View Driver Profile
When a tourist clicks on a driver card:
- System navigates to detailed profile page
- Loads complete driver information
- Displays information in organized tabs:
  - **Overview**: Experience, certifications, languages, destinations, skills
  - **Services & Rates**: Vehicle details, pricing, availability
  - **Messages**: Chat interface (for logged-in users)

### 6. Contact Driver

#### Option A: Chat (Requires Login)
1. Tourist clicks "Send Message" button
2. System checks authentication status
3. If logged in:
   - Opens chat interface
   - Creates/retrieves conversation ID (format: `userId1_userId2`)
   - Loads existing message history
   - Enables real-time message synchronization
4. Tourist sends message
5. System:
   - Saves message to Firebase (`conversations/{conversationId}/messages`)
   - Creates notification for driver
   - Updates conversation metadata
   - Shows delivery status (✓) and read status (✓✓)
6. Driver receives notification and can respond

#### Option B: Phone/WhatsApp
1. Tourist clicks phone icon
2. System opens WhatsApp with driver's phone number
3. Direct communication via phone/WhatsApp

### 7. Booking Confirmation
After discussion:
- Tourist and driver agree on terms
- Booking is confirmed
- Process complete

## Key Features

### Real-time Functionality
- **Online Status**: Live updates of driver availability
- **Message Delivery**: Instant message delivery with read receipts
- **Notifications**: Real-time push notifications for new messages
- **Filter Updates**: Instant filtering without page refresh

### User Authentication States
- **Not Logged In**: 
  - Can browse all drivers
  - Can view profiles
  - Can contact via phone
  - Must login to use chat
  
- **Logged In (Tourist)**:
  - Full access to all features
  - Can send messages via chat
  - Can view message history
  - Receives notifications

### Data Flow
```
Firebase Firestore
├── serviceProviders/{driverId}
│   ├── fullName, email, phone
│   ├── serviceType: "Jeep Driver"
│   ├── rating, pricePerDay
│   ├── online, lastSeen
│   ├── destinations[], languages[]
│   └── specialSkills[], certifications[]
│
├── conversations/{conversationId}
│   ├── participantIds[]
│   ├── lastMessage
│   ├── lastMessageTime
│   └── messages/{messageId}
│       ├── text, senderId, receiverId
│       ├── timestamp
│       └── read (boolean)
│
└── notifications/{notificationId}
    ├── type: "message"
    ├── recipientId, senderId
    ├── message, timestamp
    └── read (boolean)
```

## Error Handling

### No Results Found
If filters return no results:
1. Display "No jeeps found" message
2. Offer to clear filters
3. Show total available drivers
4. Suggest adjusting search criteria

### Connection Issues
If data fails to load:
1. Show error message
2. Offer "Try Again" button
3. Suggest checking internet connection

### Authentication Required
If not logged in when trying to chat:
1. Show "Login to Message" prompt
2. Provide login button
3. After login, return to driver profile

## Technical Implementation

### Components
- **JeepMain.jsx**: Main landing page with hero section
- **JeepSection2.jsx**: Driver listing with filters
- **JeepProfile.jsx**: Detailed driver profile with chat

### State Management
- React hooks for local state
- Firebase real-time listeners for:
  - Driver online status
  - Message updates
  - Notifications

### Navigation
- React Router for page navigation
- URL parameters for driver selection: `/jeepprofile?driverId={id}`
- Chat opening: `/jeepprofile?driverId={id}&openChat=true`

## Diagram Files

The complete PlantUML activity diagram is available in:
- **Source**: `docs/diagrams/find-jeep-driver-activity.puml`

To render the diagram:
1. Use PlantUML online editor: http://www.plantuml.com/plantuml/uml/
2. Copy the content from the `.puml` file
3. Or use PlantUML plugins in VSCode, IntelliJ, or other IDEs

## Related Documentation
- See `src/components/JeepSection2.jsx` for filter implementation
- See `src/components/JeepProfile.jsx` for profile and chat implementation
- See `src/App.jsx` for authentication flow
