# Find Jeep Driver - Quick Reference

## 🎯 What This Documents

The complete user journey for finding and booking a safari jeep driver in the SafariHub platform.

## 📋 Available Diagrams

| Diagram Type | File | Best For | How to View |
|--------------|------|----------|-------------|
| **PlantUML** | [`diagrams/find-jeep-driver-activity.puml`](diagrams/find-jeep-driver-activity.puml) | Detailed UML documentation | PlantUML renderer, IDE plugins |
| **Mermaid** | [`diagrams/find-jeep-driver-mermaid.md`](diagrams/find-jeep-driver-mermaid.md) | GitHub documentation | View directly on GitHub |
| **XML** | [`diagrams/find-jeep-driver-activity.xml`](diagrams/find-jeep-driver-activity.xml) | Structured data, tool integration | Any XML viewer/parser |
| **ASCII** | [`diagrams/visual-flowchart.md`](diagrams/visual-flowchart.md) | Quick reference | Any text viewer |
| **Detailed Docs** | [`find-jeep-driver-flow.md`](find-jeep-driver-flow.md) | Complete documentation | GitHub, any markdown viewer |

## 🚀 Quick Start

### I want to understand the user flow
👉 Start here: [`diagrams/find-jeep-driver-mermaid.md`](diagrams/find-jeep-driver-mermaid.md)

### I need technical implementation details
👉 Start here: [`find-jeep-driver-flow.md`](find-jeep-driver-flow.md)

### I need structured XML data
👉 Start here: [`diagrams/find-jeep-driver-activity.xml`](diagrams/find-jeep-driver-activity.xml)

### I need a printable diagram
👉 Start here: [`diagrams/find-jeep-driver-activity.puml`](diagrams/find-jeep-driver-activity.puml) (render to PDF)

### I want a quick text overview
👉 Start here: [`diagrams/visual-flowchart.md`](diagrams/visual-flowchart.md)

## 🔑 Key Features Documented

- ✅ Driver discovery and filtering (8 filter types)
- ✅ Real-time online/offline status
- ✅ Profile viewing with tabs
- ✅ Authentication flows
- ✅ Chat messaging with read receipts
- ✅ Phone/WhatsApp integration
- ✅ Booking process
- ✅ Notification system

## 📊 Process Overview

```
Tourist Access → Filter Drivers → View Profile → Contact (Chat/Phone) → Book
     ↓               ↓                ↓              ↓                    ↓
  System        Apply Filters    Load Info    Real-time Chat      Confirmation
```

## 🎨 User Roles

| Role | Color in Diagrams | Responsibilities |
|------|------------------|------------------|
| **Tourist** | Light Blue | Browse, filter, contact, book |
| **System** | Light Green | Load data, apply filters, sync messages |
| **Driver** | Light Yellow | Respond to messages, confirm bookings |

## 📱 Contact Methods

1. **Chat** (Requires login)
   - Real-time messaging
   - Read receipts (✓ sent, ✓✓ read)
   - Notification system

2. **Phone/WhatsApp** (No login required)
   - Direct contact
   - Instant communication

## 🔍 Filter Options

| Category | Count | Examples |
|----------|-------|----------|
| Destinations | 6 | Yala, Wilpattu, Udawalawe |
| Rating | 5 levels | 1★ to 5★ |
| Price | 6 ranges | LKR 5k - 100k |
| Vehicle Type | 4 types | Standard, Luxury, Open Roof, 4x4 |
| Languages | 8+ | English, Sinhala, Tamil, French |
| Skills | 8+ | Wildlife photography, Birdwatching |
| Certifications | 5+ | Wildlife Dept, Tourism Board |

## 🔄 Real-time Features

- 🟢 **Online Status**: Live updates every second
- 💬 **Messages**: Instant delivery and sync
- 🔔 **Notifications**: Push notifications for new messages
- ✓ **Receipts**: Sent and read confirmations

## 💾 Data Storage

### Firebase Collections Used
```
serviceProviders/        → Driver profiles
conversations/           → Chat conversations
  {conversationId}/
    messages/           → Individual messages
notifications/          → User notifications
```

## 🛠️ Technical Stack

- **Frontend**: React 19 + Tailwind CSS
- **Backend**: Firebase Firestore
- **Real-time**: Firebase listeners + Socket.io
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage

## 📝 Related Files

### Components
- `src/components/JeepMain.jsx` - Main page
- `src/components/JeepSection2.jsx` - Driver listing & filters
- `src/components/JeepProfile.jsx` - Profile view & chat

### Firebase
- `src/firebase.js` - Firebase configuration
- `src/App.jsx` - Authentication logic

## 🔗 Useful Links

- [PlantUML Online Editor](http://www.plantuml.com/plantuml/uml/)
- [Mermaid Live Editor](https://mermaid.live)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Router Docs](https://reactrouter.com/)

## 📞 Support

For questions about these diagrams:
1. Check the detailed documentation in each file
2. Review the code implementation in `src/components/`
3. Contact the development team

---

**Last Updated**: 2025-11-17  
**Version**: 1.0  
**Status**: ✅ Complete and production-ready
