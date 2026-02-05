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
      <View style={styles.header}>
        <View>
          <Text style={styles.areaName}>{data.areaName}</Text>
          <Text style={styles.date}>{data.date}</Text>
          <Text style={styles.dateTime}>{data.dateTime}</Text>
        </View>
        <View style={styles.textRight}>
          <MaterialCommunityIcons name={getWeatherIcon(data.predictedWeather)} size={32} color="#333" />
          <Text style={styles.weatherText}>{data.predictedWeather}</Text>
        </View>
      </View>
      
      <View style={styles.grid}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="thermometer" size={20} color="red" />
          <Text style={styles.text}>{data.temperature.toFixed(1)}°C</Text>
        </View>
        
        <View style={styles.row}>
          <MaterialCommunityIcons name="weather-windy" size={20} color="blue" />
          <Text style={styles.text}>{data.windSpeed} m/s</Text>
        </View>
        
        <View style={styles.row}>
          <MaterialCommunityIcons name="weather-rainy" size={20} color="blue" />
          <Text style={styles.text}>{data.precipitation}%</Text>
        </View>
        
        <View style={styles.row}>
          <MaterialCommunityIcons name="cloud" size={20} color="gray" />
          <Text style={styles.text}>{data.prefecture}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 16,
  },
  cardPressed: {
    backgroundColor: '#f0f4ff',
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  areaName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  dateTime: {
    fontSize: 15,
    color: '#666',
  },
  textRight: {
    alignItems: 'center',
  },
  weatherText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
});

export default WeatherCard;