import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Expo対応のアイコン
import { t } from '../utils/i18n';
import { WeatherData } from '../types/weather';

interface WeatherCardProps {
  data: WeatherData;
  onPress?: (data: WeatherData) => void;
}

export const mapWeatherToKey = (weather: string) => {
  if (!weather) return 'partly_cloudy';
  const w = weather.toLowerCase();
  if (w.includes('晴')) return 'sunny';
  if (w.includes('曇') || w.includes('くも')) return 'cloudy';
  if (w.includes('雨') && w.includes('雷') === false) {
    if (w.includes('小雨')) return 'light_rain';
    if (w.includes('にわか') || w.includes('通り雨')) return 'shower';
    return 'rain';
  }
  if (w.includes('雪')) {
    if (w.includes('大雪')) return 'heavy_snow';
    if (w.includes('吹雪') || w.includes('暴風雪')) return 'blizzard';
    if (w.includes('霧雪') || w.includes('にわか雪')) return 'sleet';
    return 'snow';
  }
  if (w.includes('暴風') || w.includes('暴風雨')) return 'storm';
  if (w.includes('強風')) return 'windy';
  if (w.includes('暴風')) return 'hurricane';
  if (w.includes('霧')) return 'fog';
  if (w.includes('雷')) return 'thunderstorm';
  if (w.includes('雹') || w.includes('ひょう')) return 'hail';
  return 'partly_cloudy';
};

export const getWeatherIcon = (weatherKey: string) => {
  // weatherKey may be either a normalized key (english-like) or a Japanese description -> normalize
  let key = weatherKey || '';
  // detect CJK or hiragana/katakana characters; if present, map to key
  if (/[一-龯ぁ-ゔァ-ヴ]/.test(key)) {
    key = mapWeatherToKey(key);
  }
  switch ((key || '').toLowerCase()) {
    case 'sunny':
      return 'weather-sunny';
    case 'cloudy':
      return 'weather-cloudy';
    case 'rain':
    case 'light_rain':
      return 'weather-rainy';
    case 'shower':
      return 'weather-pouring';
    case 'snow':
      return 'weather-snowy';
    case 'heavy_snow':
    case 'blizzard':
      return 'weather-snowy-heavy';
    case 'storm':
    case 'thunderstorm':
      return 'weather-lightning';
    case 'hurricane':
      return 'weather-hurricane';
    case 'windy':
      return 'weather-windy';
    case 'fog':
      return 'weather-fog';
    case 'hail':
      return 'weather-hail';
    default:
      return 'weather-partly-cloudy';
  }
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ data, onPress }) => {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      onPress={() => onPress?.(data)}
    >
      {/* Time Header */}
      <View style={styles.timeSection}>
        <Text style={styles.dateTime}>{data.dateTime}</Text>
        <Text style={styles.date}>{data.date}</Text>
      </View>

      {/* Weather Icon and Temp */}
      <View style={styles.mainContent}>
        <MaterialCommunityIcons 
          name={getWeatherIcon(mapWeatherToKey(data.predictedWeather))} 
          size={44} 
          color="#1976D2" 
        />
        <View style={styles.tempSection}>
          <Text style={styles.temperature}>{data.temperature.toFixed(0)}°C</Text>
          <Text style={styles.weatherInfo}>{t(
            `conditions.${mapWeatherToKey(data.predictedWeather)}`,
          )}</Text>
        </View>
      </View>

      {/* Bottom Stats */}
      <View style={styles.statsSection}>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="water-percent" size={14} color="#1976D2" />
          <Text style={styles.statValue}>{data.precipitation}%</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <MaterialCommunityIcons name="weather-windy" size={14} color="#1976D2" />
          <Text style={styles.statValue}>{data.windSpeed}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  cardPressed: {
    backgroundColor: '#F5F9FF',
    elevation: 4,
    shadowOpacity: 0.15,
  },
  timeSection: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
    paddingBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#90A4AE',
    marginTop: 2,
  },
  dateTime: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1976D2',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  tempSection: {
    flex: 1,
  },
  temperature: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1976D2',
  },
  weatherInfo: {
    fontSize: 13,
    color: '#546E7A',
    fontWeight: '500',
    marginTop: 2,
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    color: '#37474F',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#E0E0E0',
  },
});

export default WeatherCard;