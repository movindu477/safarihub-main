# SafariHub - Safari Jeep Driver Booking Platform

SafariHub is a web platform connecting tourists with experienced safari jeep drivers in Sri Lanka. The platform enables users to browse, filter, and contact verified jeep drivers for wildlife safari adventures across national parks.

## Features

### For Tourists
- 🔍 **Browse Safari Jeep Drivers** - View profiles of experienced drivers
- 🎯 **Advanced Filtering** - Filter by destination, rating, price, vehicle type, languages, and more
- 💬 **Real-time Chat** - Direct messaging with drivers
- 🌐 **Multi-language Support** - Drivers speak multiple languages
- ⭐ **Rating System** - View driver ratings and reviews
- 📱 **Contact Options** - Chat or call via WhatsApp/Phone
- 🟢 **Online Status** - See which drivers are currently online

### For Service Providers (Jeep Drivers)
- 📝 **Profile Management** - Create and manage detailed profiles
- 💰 **Pricing Control** - Set your own daily rates
- 📅 **Availability Calendar** - Manage your available dates
- 🔔 **Notifications** - Get notified of new messages and bookings
- 🚙 **Vehicle Showcase** - Display your vehicle type and features
- 🏆 **Certifications** - Showcase your certifications and experience

## Technology Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Real-time**: Socket.io + Firebase Real-time listeners
- **Routing**: React Router v7
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/movindu477/safarihub-main.git
cd safarihub-main
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Start the backend server (in a separate terminal):
```bash
npm run server
```

Or run both concurrently:
```bash
npm run dev:full
```

### Build for Production
```bash
npm run build
npm run preview
```

## Documentation

### Activity Diagrams
We provide comprehensive activity diagrams for understanding the user flows:

- **[Find Jeep Driver Flow (Detailed)](docs/find-jeep-driver-flow.md)** - Complete documentation of the jeep driver search and booking process
- **[PlantUML Diagram](docs/diagrams/find-jeep-driver-activity.puml)** - Detailed activity diagram in PlantUML format
- **[Mermaid Diagram](docs/diagrams/find-jeep-driver-mermaid.md)** - Interactive diagrams viewable on GitHub

### Key Features Documented
1. **Driver Discovery Process**
   - Browsing available drivers
   - Applying filters (destination, rating, price, etc.)
   - Viewing driver profiles

2. **Communication Flow**
   - Real-time chat messaging
   - Notification system
   - Phone/WhatsApp integration

3. **Authentication Flow**
   - Tourist registration
   - Service provider registration
   - Login/logout processes

## Project Structure

```
safarihub-main/
├── docs/                           # Documentation
│   ├── find-jeep-driver-flow.md   # Detailed flow documentation
│   └── diagrams/                   # Activity diagrams
│       ├── find-jeep-driver-activity.puml  # PlantUML diagram
│       └── find-jeep-driver-mermaid.md     # Mermaid diagrams
├── public/                         # Static assets
├── src/
│   ├── components/                 # React components
│   │   ├── JeepMain.jsx           # Main jeep drivers page
│   │   ├── JeepSection2.jsx       # Driver listing & filters
│   │   ├── JeepProfile.jsx        # Driver profile & chat
│   │   ├── Navbar.jsx             # Navigation bar
│   │   └── ...
│   ├── assets/                     # Images and media
│   ├── App.jsx                     # Main application component
│   ├── firebase.js                 # Firebase configuration
│   └── main.jsx                    # Application entry point
├── server.js                       # Express server for Socket.io
└── package.json
```

## Firebase Configuration

The application uses Firebase for:
- **Firestore** - Database for users, drivers, messages, notifications
- **Authentication** - Email/password authentication
- **Storage** - Profile pictures and media
- **Real-time Updates** - Online status and message sync

### Firestore Collections
- `tourists` - Tourist user profiles
- `serviceProviders` - Jeep driver profiles
- `conversations` - Chat conversations
- `conversations/{id}/messages` - Individual messages
- `notifications` - User notifications

## Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run server` - Start Socket.io server
- `npm run dev:full` - Run both dev server and Socket.io concurrently
- `npm start` - Start the server

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For support, please contact the development team or open an issue in the repository.

---

## React + Vite Template Information

This project is built on top of the React + Vite template, which provides:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for more information.
