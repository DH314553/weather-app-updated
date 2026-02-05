export interface WeatherData {
  dateIndex: number;
  date: string;
  dateTime: string;
  areaName: string;
  prefecture: string;
  windSpeed: string;
  precipitation: number;
  temperature: number;
  predictedWeather: string;
  actualWeather: string;
  isPredictionCorrect: boolean;
  latitude: string;
  longitude: string;
}

export interface WeatherResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    rain: number;
    showers: number;
    snowfall: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    rain: number[];
    weather_code: number[];
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}