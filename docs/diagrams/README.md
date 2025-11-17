# Activity Diagrams - Index

This directory contains comprehensive activity diagrams for the SafariHub platform, specifically documenting the "Find Jeep Driver" feature.

## Available Diagrams

### 1. PlantUML Activity Diagram
**File**: `find-jeep-driver-activity.puml`

A detailed UML activity diagram showing the complete flow of finding and contacting a jeep driver. This diagram uses PlantUML syntax and can be rendered using:

- **Online**: [PlantUML Web Server](http://www.plantuml.com/plantuml/uml/)
- **IDE Plugins**: VSCode, IntelliJ IDEA, Eclipse
- **Command Line**: PlantUML JAR

**Features**:
- Swimlane diagram showing Tourist, System, and Driver actors
- Decision points and conditional flows
- Complete authentication flow
- Chat messaging sequence
- Real-time features documentation

### 2. Mermaid Diagrams
**File**: `find-jeep-driver-mermaid.md`

Interactive diagrams in Mermaid format that render directly on GitHub. Includes:

- **Flowchart**: Visual representation of the complete user journey
- **Sequence Diagram**: Tourist-System-Driver interaction flow
- Color-coded decision points and system actions

**Viewing**:
- View directly on GitHub (automatic rendering)
- Use Mermaid Live Editor: https://mermaid.live
- VSCode with Mermaid extension
- Markdown preview with Mermaid support

### 3. Visual ASCII Flowchart
**File**: `visual-flowchart.md`

Text-based flowcharts using ASCII art for quick reference without needing any rendering tools.

**Includes**:
- Main process flowchart
- Swimlane view (Tourist/System/Driver)
- Decision tree
- Key features summary
- Filter options reference

**Viewing**:
- Any text editor
- GitHub file preview
- Terminal/console
- Documentation readers

## Quick Start Guide

### For Developers
1. **Understanding the Flow**: Start with `visual-flowchart.md` for a quick overview
2. **Detailed Analysis**: Review `find-jeep-driver-activity.puml` for comprehensive logic
3. **Implementation Reference**: See the detailed documentation in `../find-jeep-driver-flow.md`

### For Product Managers
1. **User Journey**: Check `find-jeep-driver-mermaid.md` for visual flow
2. **Feature Documentation**: Read `../find-jeep-driver-flow.md` for complete feature details
3. **Key Metrics**: Review decision points and filter options in any diagram

### For Designers
1. **User Flow**: Study the mermaid flowchart for UI/UX design
2. **Interaction Points**: Identify all user interaction points from diagrams
3. **States**: Understand different states (logged in/out, online/offline, etc.)

## Diagram Coverage

All diagrams document the following processes:

### 1. Driver Discovery
- Accessing the platform
- Navigating to driver listing
- System loading and filtering
- Applying search filters
- Viewing results

### 2. Driver Selection
- Browsing driver cards
- Viewing driver profiles
- Reviewing detailed information
- Checking online status

### 3. Communication
- Authentication check
- Chat messaging flow
- Phone/WhatsApp contact
- Real-time notifications
- Message delivery and read receipts

### 4. Booking Process
- Driver-tourist discussion
- Terms negotiation
- Booking confirmation

## Filter Options Documented

All diagrams include these filter capabilities:

| Filter Type | Options |
|-------------|---------|
| **Destinations** | 6 national parks |
| **Rating** | 1-5 stars |
| **Price Range** | LKR 5,000 - 100,000/day |
| **Vehicle Type** | Standard, Luxury, Open Roof, 4x4 Modified |
| **Languages** | English, Sinhala, Tamil, Hindi, French, German, Chinese, Japanese |
| **Special Skills** | 8+ services (Wildlife photography, Birdwatching, etc.) |
| **Certifications** | 5+ types (Wildlife Dept, Tourism Board, First Aid, etc.) |

## Real-time Features

All diagrams document these real-time capabilities:
- 🟢 Online/offline status updates
- 💬 Live chat messaging
- 🔔 Push notifications
- ✓ Message delivery receipts
- ✓✓ Message read receipts
- 🔄 Instant filter updates

## Related Documentation

- **Detailed Flow**: [`../find-jeep-driver-flow.md`](../find-jeep-driver-flow.md)
- **Main README**: [`../../README.md`](../../README.md)
- **Source Code**: 
  - Driver Listing: `src/components/JeepSection2.jsx`
  - Driver Profile: `src/components/JeepProfile.jsx`
  - Main Page: `src/components/JeepMain.jsx`

## Contributing

When updating these diagrams:

1. **Consistency**: Keep all diagram types in sync
2. **Completeness**: Document all decision points and flows
3. **Clarity**: Use clear labels and descriptions
4. **Testing**: Verify diagrams render correctly in target platforms

## Diagram Formats Comparison

| Format | Best For | Rendering | Editing |
|--------|----------|-----------|---------|
| **PlantUML** | Detailed UML diagrams | Requires tools | Text-based |
| **Mermaid** | GitHub documentation | Automatic on GitHub | Text-based |
| **ASCII** | Quick reference | Any text viewer | Any text editor |

## License

These diagrams are part of the SafariHub project documentation and follow the same license as the main project.

---

**Last Updated**: 2025-11-17  
**Version**: 1.0  
**Maintained By**: SafariHub Development Team
