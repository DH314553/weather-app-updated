import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Expo対応のアイコン
import { WeatherData } from '../types/weather';

interface WeatherCardProps {
  data: WeatherData;
  onPress?: (data: WeatherData) => void;
}

export const getWeatherIcon = (weather: string) => {
  switch (weather.toLowerCase()) {
    case '晴れ':
      return 'weather-sunny';
    case '曇り':
      return 'weather-cloudy';
    case '雨':
      return 'weather-rainy';
    case '雪':
      return 'weather-snowy';
    case '暴風雨':
      return 'weather-lightning-rainy';
    case '暴風雪':
      return 'weather-snowy-heavy';
    case '吹雪':
      return 'weather-snowy-heavy';
    case '大雪':
      return 'weather-snowy-heavy';
    case '小雨':
      return 'weather-rainy';
    case '通り雨':
      return 'weather-pouring';
    case '強風':
      return 'weather-windy';
    case '暴風':
      return 'weather-hurricane';
    case '霧':
      return 'weather-fog';
    case '霧雪':
      return 'weather-snowy-heavy';
    case 'にわか雨':
      return 'weather-pouring';
    case 'にわか雪':
      return 'weather-snowy-heavy';
    case '雷雨':
      return 'weather-lightning';
    case '雷を伴う雹':
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
          name={getWeatherIcon(data.predictedWeather)} 
          size={44} 
          color="#1976D2" 
        />
        <View style={styles.tempSection}>
          <Text style={styles.temperature}>{data.temperature.toFixed(0)}°C</Text>
          <Text style={styles.weatherInfo}>{data.predictedWeather}</Text>
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