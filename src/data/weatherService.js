const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Fetch current weather
export const getCurrentWeather = async (lat, lon) => {
  const res = await fetch(
    `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
  );

  if (!res.ok) {
    throw new Error('Failed to fetch current weather');
  }

  return res.json();
};

// Fetch 5-day / 3-hour forecast
export const getForecastWeather = async (lat, lon) => {
  const res = await fetch(
    `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
  );

  if (!res.ok) {
    throw new Error('Failed to fetch forecast');
  }

  return res.json();
};
