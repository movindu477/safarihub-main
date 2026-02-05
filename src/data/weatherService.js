const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY;

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Mock data for development or when API key is missing
const getMockCurrentWeather = () => ({
  weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
  main: { temp: 28, feels_like: 30, humidity: 75, pressure: 1012 },
  wind: { speed: 4.5 },
  name: 'Yala'
});

const getMockForecast = () => ({
  list: Array(40).fill(null).map((_, i) => ({
    dt_txt: new Date(Date.now() + i * (3 * 3600 * 1000)).toISOString().replace('T', ' ').substring(0, 19),
    main: { temp: 28 + Math.random() * 2 },
    weather: [{
      main: (Math.floor(i / 8)) % 2 === 0 ? 'Clear' : 'Clouds',
      description: (Math.floor(i / 8)) % 2 === 0 ? 'clear sky' : 'broken clouds',
      icon: '01d'
    }]
  }))
});

// Helper to check if API key is valid
const hasValidKey = () => API_KEY && API_KEY !== 'YOUR_API_KEY_HERE';

// Fetch current weather
export const getCurrentWeather = async (lat, lon) => {
  if (!hasValidKey()) {
    console.warn('Weather API key missing. Using mock data.');
    return getMockCurrentWeather();
  }

  try {
    const res = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    if (!res.ok) {
      if (res.status === 401) {
        console.warn('Weather API key invalid. Using mock data.');
        return getMockCurrentWeather();
      }
      throw new Error(`Weather API error: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching weather:', error);
    // Fallback to mock data on error to prevent UI crash
    return getMockCurrentWeather();
  }
};

// Fetch 5-day / 3-hour forecast
export const getForecastWeather = async (lat, lon) => {
  if (!hasValidKey()) {
    return getMockForecast();
  }

  try {
    const res = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    if (!res.ok) {
      if (res.status === 401) {
        return getMockForecast();
      }
      throw new Error(`Forecast API error: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching forecast:', error);
    return getMockForecast();
  }
};
