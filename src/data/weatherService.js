const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY || 'YOUR_API_KEY_HERE';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Fetch current weather
export const getCurrentWeather = async (lat, lon) => {
  try {
    const res = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    if (!res.ok) {
      console.error('Weather API response not ok:', res.status);
      throw new Error('Failed to fetch current weather');
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
};

// Fetch 5-day / 3-hour forecast
export const getForecastWeather = async (lat, lon) => {
  try {
    const res = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    if (!res.ok) {
      console.error('Forecast API response not ok:', res.status);
      throw new Error('Failed to fetch forecast');
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching forecast:', error);
    throw error;
  }
};
