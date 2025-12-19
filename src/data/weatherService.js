// Use VITE_ prefix for Vite environment variables
const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Get current + forecast weather by coordinates
 * Returns current weather and 5-day / 3-hour forecast
 */
export const getWeatherByCoordinates = async (lat, lon) => {
  try {
    const currentRes = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    const forecastRes = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    if (!currentRes.ok || !forecastRes.ok) {
      throw new Error('Weather API failed');
    }

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    return {
      current,
      forecast
    };
  } catch (error) {
    console.error('Weather API Error:', error);
    throw error;
  }
};
