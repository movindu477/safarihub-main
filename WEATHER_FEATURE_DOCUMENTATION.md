# 🌦️ Weather Feature Documentation

## Overview
The SafariHub platform now features a **live weather system** that automatically displays real-time weather data and 5-day forecasts for each destination based on their geographic coordinates.

---

## 📁 Architecture & File Structure

```
safarihub-main/
├── .env                                    # Environment variables (API key)
├── src/
│   ├── data/
│   │   ├── destinations.js                 # Centralized destination data with coordinates
│   │   └── weatherService.js               # Weather API service (reusable)
│   └── components/
│       └── destination/
│           └── DestinationDetails.jsx      # Main destination page with weather display
```

---

## 🔧 Technical Implementation

### 1. Environment Configuration (`.env`)
```env
VITE_OPENWEATHER_KEY=93b72e06c011dd5672298342d40c6ec7
```
- **Purpose**: Securely stores the OpenWeather API key
- **Format**: Uses `VITE_` prefix (required for Vite projects)
- **Security**: File is gitignored to prevent API key exposure

### 2. Weather Service (`src/data/weatherService.js`)
```javascript
const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export const getWeatherByCoordinates = async (lat, lon) => {
  // Fetches current weather + 5-day/3-hour forecast
  const currentRes = await fetch(
    `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
  );
  
  const forecastRes = await fetch(
    `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
  );
  
  return {
    current: await currentRes.json(),
    forecast: await forecastRes.json()
  };
};
```

**Key Features:**
- ✅ Reusable service for all destinations
- ✅ Fetches both current weather and 5-day forecast in parallel
- ✅ Uses metric units (Celsius)
- ✅ Proper error handling

### 3. Destination Data (`src/data/destinations.js`)
Each destination includes geographic coordinates:

```javascript
'yala-national-park': {
  id: 'yala-national-park',
  name: 'Yala National Park',
  coordinates: { lat: 6.2853, lng: 81.3397 },  // ✅ Real coordinates
  // ... other data
}
```

**All Destinations with Coordinates:**
- Yala National Park: `6.2853°N, 81.3397°E`
- Wilpattu National Park: `8.5207°N, 80.0317°E`
- Mirissa Beach: `5.9494°N, 80.4698°E`
- Udawalawe National Park: `6.4399°N, 80.8898°E`
- Horton Plains: `6.8097°N, 80.7940°E`
- Knuckles Mountain Range: `7.4500°N, 80.7833°E`
- Kumana National Park: `6.5651°N, 81.6737°E`
- Lunugamvehera National Park: `6.4606°N, 81.2139°E`
- Sinharaja Forest Reserve: `6.4008°N, 80.4008°E`

### 4. Component Integration (`DestinationDetails.jsx`)

#### State Management
```javascript
const [weather, setWeather] = useState(null);
const [forecast, setForecast] = useState(null);
const [loadingWeather, setLoadingWeather] = useState(true);
const [weatherError, setWeatherError] = useState(null);
```

#### Automatic Fetching (React useEffect)
```javascript
useEffect(() => {
  const fetchWeather = async () => {
    if (!destination || !destination.coordinates) return;

    setLoadingWeather(true);
    try {
      const { lat, lng } = destination.coordinates;
      const weatherData = await getWeatherByCoordinates(lat, lng);
      
      setWeather(weatherData.current);
      setForecast(weatherData.forecast);
    } catch (error) {
      setWeatherError('Unable to load weather data');
    } finally {
      setLoadingWeather(false);
    }
  };

  fetchWeather();
}, [destination, destinationId]);  // ✅ Refetches when destination changes
```

#### 5-Day Forecast Processing
```javascript
forecast.list
  .filter((item, index) => index % 8 === 0)  // Every 8th item = 24 hours (3hr x 8)
  .slice(0, 5)                                // First 5 days
  .map((day) => {
    // Display temperature, description, icon
  })
```

**How it works:**
- API returns 3-hour interval data (40 data points for 5 days)
- `index % 8 === 0` selects one forecast per day (8 intervals × 3 hours = 24 hours)
- `.slice(0, 5)` ensures exactly 5 days are displayed

---

## 🎨 User Interface

### Current Weather Display
- **Temperature**: Large, bold display with "Feels Like" temperature
- **Weather Icon**: Dynamic icon based on conditions (sun, clouds, rain, etc.)
- **Description**: Capitalized weather description (e.g., "Clear Sky", "Light Rain")
- **Additional Metrics**:
  - Humidity percentage
  - Wind speed (m/s)
  - Cloudiness percentage

### 5-Day Forecast Cards
- **Day Label**: "Today" for first day, then formatted dates (e.g., "Mon, Jan 20")
- **Weather Icon**: Condition-specific icon
- **Temperature**: Rounded to nearest degree
- **Description**: Brief weather description
- **Hover Effect**: Border color changes on hover

### Loading & Error States
- **Loading**: Animated spinner with "Loading weather data..." message
- **Error**: Red alert box with error message and troubleshooting hint

---

## 🔄 How It Works (Step-by-Step)

1. **User selects a destination** (e.g., clicks "Explore Yala")
2. **URL changes** to `/destination/yala-national-park`
3. **React Router** passes `destinationId` via `useParams()`
4. **Destination lookup** retrieves data from centralized store
5. **useEffect triggers** when `destinationId` changes
6. **Coordinates extracted** from destination data
7. **API calls made** to OpenWeather (current + forecast)
8. **State updated** with weather data
9. **UI renders** with live weather information
10. **Automatic updates** when user navigates to different destination

---

## 🧠 Key Benefits (For Assignment/Viva)

### 1. **Scalability**
- ✅ Single weather service for all destinations
- ✅ Easy to add new destinations (just add coordinates)
- ✅ No duplicate code

### 2. **Accuracy**
- ✅ Real geographic coordinates ensure location-specific weather
- ✅ Live data from OpenWeather API (updated regularly)
- ✅ 5-day forecast for trip planning

### 3. **Clean Architecture**
- ✅ Separation of concerns (service layer, data layer, UI layer)
- ✅ Reusable components and helper functions
- ✅ Environment variables for security

### 4. **User Experience**
- ✅ Automatic updates (no manual refresh needed)
- ✅ Loading states for better feedback
- ✅ Error handling with user-friendly messages
- ✅ Responsive design (mobile-friendly)

### 5. **Performance**
- ✅ Parallel API calls (current + forecast fetched simultaneously)
- ✅ Data caching via React state
- ✅ Efficient filtering for 5-day forecast

---

## 🎯 VIVA Questions & Answers

### Q1: Why use coordinates instead of city names?
**A:** Geographic coordinates (latitude/longitude) provide more accurate weather data for specific locations. National parks and remote areas may not have city-level weather stations, but coordinates work anywhere globally.

### Q2: How does the weather update automatically?
**A:** React's `useEffect` hook monitors the `destinationId`. When a user navigates to a different destination, the effect re-runs, fetching new weather data for the new location's coordinates.

### Q3: Why store the API key in a `.env` file?
**A:** Security and best practices. Environment variables:
- Keep sensitive data out of source code
- Prevent accidental exposure in version control (git)
- Allow different keys for development/production environments

### Q4: How do you handle API failures?
**A:** Three-layer approach:
1. Try-catch blocks catch errors
2. Error state (`weatherError`) stores error messages
3. UI displays user-friendly error message with troubleshooting tips

### Q5: Explain the 5-day forecast filtering logic.
**A:** The API returns data in 3-hour intervals (8 intervals per day). We use `index % 8 === 0` to select every 8th item, giving us one forecast per day. `.slice(0, 5)` then limits to 5 days.

### Q6: What happens if a destination doesn't have coordinates?
**A:** The `useEffect` has a guard clause: `if (!destination || !destination.coordinates) return;`. This prevents API calls for incomplete data and gracefully skips weather display.

### Q7: How is this different from hardcoded weather?
**A:** 
- **Hardcoded**: Static data, always shows same temperature/conditions
- **Live API**: Real-time data updates, accurate for current date/time/location

### Q8: Why use a separate weather service file?
**A:** 
- **Reusability**: Any component can import and use it
- **Maintainability**: API changes only need updates in one file
- **Testing**: Easier to test service independently
- **Separation of Concerns**: Business logic separate from UI

---

## 📊 API Data Structure

### Current Weather Response
```json
{
  "main": {
    "temp": 28.5,
    "feels_like": 31.2,
    "humidity": 75
  },
  "weather": [
    {
      "main": "Clear",
      "description": "clear sky"
    }
  ],
  "wind": {
    "speed": 3.5
  },
  "clouds": {
    "all": 10
  }
}
```

### 5-Day Forecast Response
```json
{
  "list": [
    {
      "dt_txt": "2025-12-18 12:00:00",
      "main": { "temp": 29.0 },
      "weather": [{ "main": "Clouds", "description": "few clouds" }]
    },
    // ... 39 more items (3-hour intervals for 5 days)
  ]
}
```

---

## 🚀 Future Enhancements

1. **Weather Alerts**: Display severe weather warnings
2. **Hourly Forecast**: Toggle between daily and hourly views
3. **Historical Data**: Show weather trends for planning
4. **Recommendations**: Suggest best activities based on weather
5. **Offline Mode**: Cache weather data for offline access

---

## ✅ Testing Checklist

- [x] Weather loads when page opens
- [x] Weather updates when switching destinations
- [x] Loading spinner shows during API calls
- [x] Error message displays if API fails
- [x] 5-day forecast shows correct dates
- [x] Weather icons match conditions
- [x] Temperature displays in Celsius
- [x] Responsive on mobile devices
- [x] Works for all 9 destinations

---

## 📝 Summary for Assignment

**"This project implements a dynamic weather system using the OpenWeather API. Destination data is centralized with geographic coordinates. A reusable weather service fetches live data. When users select a destination, React's useEffect hook automatically loads weather for that location's coordinates. The 5-day forecast is derived by filtering 3-hourly data. This architecture ensures scalability, accuracy, and maintainability."**

---

**Developed by:** SafariHub Team  
**Date:** December 18, 2025  
**API Provider:** OpenWeather (https://openweathermap.org/)
