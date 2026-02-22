import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WeatherCard } from '../components/WeatherCard';
import { getWeatherIcon } from '../components/WeatherCard';
import { WeatherData } from '../types/weather';
import { fetchWeatherData, fetchCoordinates, predictWeather } from '../utils/weather';
import { t } from '../utils/i18n';

const WORLD_CITIES = [
  { nameKey: 'newyork', countryKey: 'usa', displayName: 'New York', lat: '40.7128', lng: '-74.0060' },
  { nameKey: 'london', countryKey: 'uk', displayName: 'London', lat: '51.5074', lng: '-0.1278' },
  { nameKey: 'tokyo', countryKey: 'japan', displayName: 'Tokyo', lat: '35.6762', lng: '139.6503' },
  { nameKey: 'paris', countryKey: 'france', displayName: 'Paris', lat: '48.8566', lng: '2.3522' },
  { nameKey: 'sydney', countryKey: 'australia', displayName: 'Sydney', lat: '-33.8688', lng: '151.2093' },
  { nameKey: 'dubai', countryKey: 'uae', displayName: 'Dubai', lat: '25.2048', lng: '55.2708' },
  { nameKey: 'singapore', countryKey: 'singapore', displayName: 'Singapore', lat: '1.3521', lng: '103.8198' },
  { nameKey: 'bangkok', countryKey: 'thailand', displayName: 'Bangkok', lat: '13.7563', lng: '100.5018' },
  { nameKey: 'seoul', countryKey: 'southkorea', displayName: 'Seoul', lat: '37.5665', lng: '126.9780' },
  { nameKey: 'barcelona', countryKey: 'spain', displayName: 'Barcelona', lat: '41.3851', lng: '2.1734' },
  { nameKey: 'toronto', countryKey: 'canada', displayName: 'Toronto', lat: '43.6629', lng: '-79.3957' },
  { nameKey: 'berlin', countryKey: 'germany', displayName: 'Berlin', lat: '52.5200', lng: '13.4050' },
];


// Helper function to get localized city and country names
const getLocalizedCityName = (cityKey: string): string => {
  return t(`world.cities.${cityKey}`);
};

const getLocalizedCountryName = (countryKey: string): string => {
  return t(`world.countries.${countryKey}`);
};

export default function WorldWeatherScreen() {
  const [customCity, setCustomCity] = useState<string>('');
  const [weatherDataList, setWeatherDataList] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [showWeatherDetail, setShowWeatherDetail] = useState<boolean>(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const fetchWeatherForCity = async (lat: string, lng: string, cityName: string) => {
    try {
      setLoading(true);
      const weatherResponse = await fetchWeatherData(lat, lng);

      if (!weatherResponse || !weatherResponse.current) {
        throw new Error(t('world.errors.fetchFailed', { city: cityName }));
      }

      const current = weatherResponse.current;
      const hourly = weatherResponse.hourly;

      if (!hourly) {
        throw new Error(t('weather.fetchError'));
      }

      const currentTime = new Date();
      const hourIndex = currentTime.getHours();

      const temp = (current as any).temperature_2m ?? 0;
      const weatherCode = (current as any).weather_code ?? 0;
      const windSpeed = (current as any).wind_speed_10m ?? 0;
      const precipitation = (hourly.precipitation_probability as any)?.[hourIndex] ?? 0;
      const humidity = (current as any).relative_humidity_2m ?? 0;

      const predictedWeatherStr = predictWeather(weatherCode, temp, precipitation, windSpeed);

      const newWeather: WeatherData = {
        areaName: cityName,
        date: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
        dateTime: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        temperature: temp,
        windSpeed: windSpeed.toString(),
        precipitation: precipitation,
        prefecture: 'World',
        predictedWeather: predictedWeatherStr,
        dateIndex: 0,
        actualWeather: '',
        isPredictionCorrect: false,
        latitude: lat,
        longitude: lng,
      };

      setWeatherDataList((prev) => [...prev, newWeather]);
      setSelectedCities((prev) => [...prev, cityName]);
    } catch (error) {
      console.error(`Error fetching weather for ${cityName}:`, error);
      Alert.alert(t('common.error'), t('world.errors.fetchFailed', { city: cityName }));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomCitySearch = async () => {
    if (!customCity.trim()) {
      Alert.alert(t('common.error'), t('world.errors.enterName'));
      return;
    }

    try {
      setLoading(true);
      const coords = await fetchCoordinates(customCity, true); // 第2引数 true で世界検索モード
      if (coords) {
        await fetchWeatherForCity(coords.lat, coords.lon, customCity);
        setCustomCity('');
        } else {
        Alert.alert(t('common.error'), t('world.errors.notFound', { city: customCity }));
      }
    } catch (error) {
      console.error('❌ Error searching city:', error);
      Alert.alert(t('common.error'), `${t('world.errors.searchFailed', { city: customCity })}\n都市が見つかりません。別の都市名をお試しください。`);
    } finally {
      setLoading(false);
    }
  };

  const removeCityWeather = (cityName: string) => {
    setWeatherDataList((prev) => prev.filter((w) => w.areaName !== cityName));
    setSelectedCities((prev) => prev.filter((c) => c !== cityName));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.appTitle}>{t('world.title')}</Text>
        </View>
        <Text style={styles.headerSubtitle}>{t('world.subtitle')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Custom City Search */}
        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>{t('world.search')}</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('world.searchPlaceholder')}
              value={customCity}
              onChangeText={setCustomCity}
              placeholderTextColor="#999"
            />
            <Pressable
              style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}
              onPress={handleCustomCitySearch}
              disabled={loading}
            >
              <Text style={styles.searchButtonText}>{loading ? t('world.searching') : t('world.searchButton')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Preset Cities */}
        <View style={styles.citiesCard}>
          <Text style={styles.sectionTitle}>{t('world.addMajorCities')}</Text>
          <View style={styles.citiesGrid}>
            {WORLD_CITIES.map((city) => {
              const localizedCityName = getLocalizedCityName(city.nameKey);
              return (
                <Pressable
                  key={city.nameKey}
                  style={({ pressed }) => [
                    styles.cityButton,
                    selectedCities.includes(localizedCityName) && styles.cityButtonActive,
                    pressed && styles.cityButtonPressed,
                  ]}
                  onPress={() => {
                    if (!selectedCities.includes(localizedCityName)) {
                      fetchWeatherForCity(city.lat, city.lng, localizedCityName);
                    } else {
                      removeCityWeather(localizedCityName);
                    }
                  }}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.cityButtonText,
                      selectedCities.includes(localizedCityName) && styles.cityButtonTextActive,
                    ]}
                  >
                    {localizedCityName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Weather Cards */}
        <View style={styles.weatherSection}>
          <View style={styles.weatherHeaderContainer}>
            <Text style={styles.sectionTitle}>{t('world.weatherInfo')}</Text>
            {weatherDataList.length > 0 && (
              <Pressable
                onPress={() => {
                  setWeatherDataList([]);
                  setSelectedCities([]);
                }}
              >
                <Text style={styles.clearButtonText}>{t('world.clearAll')}</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.weatherCardsContainer}>
            {weatherDataList.length > 0 ? (
              weatherDataList.map((data, index) => (
                <View key={index}>
                  <WeatherCard
                    data={data}
                    onPress={(weatherData) => {
                      setSelectedWeather(weatherData);
                      setShowWeatherDetail(true);
                    }}
                  />
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeCityWeather(data.areaName)}
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                    <Text style={styles.removeButtonText}>{t('world.remove')}</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>{t('world.noSelection')}</Text>
            )}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Weather Detail Modal */}
      <Modal
        visible={showWeatherDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWeatherDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('detail.title', { area: selectedWeather?.areaName || '' })}</Text>
              <View style={styles.closeButtonContainer}>
                <Button title={t('common.close')} onPress={() => setShowWeatherDetail(false)} color="#2196F3" />
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedWeather && (
                <View>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>{t('detail.date')}</Text>
                    <Text style={styles.detailValue}>{selectedWeather.date} {selectedWeather.dateTime}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>{t('detail.weather')}</Text>
                    <View style={styles.weatherDetailRow}>
                      <MaterialCommunityIcons
                        name={getWeatherIcon(selectedWeather.predictedWeather)}
                        size={48}
                        color="#FF9800"
                      />
                      <Text style={styles.detailLargeValue}>{selectedWeather.predictedWeather}</Text>
                    </View>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>{t('detail.temperature')}</Text>
                    <Text style={styles.detailValue}>{selectedWeather.temperature.toFixed(1)}°C</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>{t('detail.precipitation')}</Text>
                    <View style={styles.barContainer}>
                      <View style={[styles.barProgressFill, { width: `${selectedWeather.precipitation}%` }]} />
                    </View>
                    <Text style={styles.detailValue}>{selectedWeather.precipitation}%</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>{t('detail.wind')}</Text>
                    <Text style={styles.detailValue}>{selectedWeather.windSpeed} m/s</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTopRow: {
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  searchCard: {
    backgroundColor: 'white',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderTopWidth: 3,
    borderTopColor: '#1976D2',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#424242',
  },
  searchButton: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  searchButtonPressed: {
    backgroundColor: '#1565C0',
    elevation: 5,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  citiesCard: {
    backgroundColor: 'white',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderTopWidth: 3,
    borderTopColor: '#F57C00',
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cityButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cityButtonActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1565C0',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  cityButtonPressed: {
    elevation: 2,
  },
  cityButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  cityButtonTextActive: {
    color: 'white',
  },
  weatherSection: {
    marginBottom: 16,
  },
  weatherHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButtonText: {
    color: '#FF5252',
    fontWeight: '600',
    fontSize: 12,
  },
  weatherCardsContainer: {
    gap: 12,
  },
  removeButton: {
    backgroundColor: '#FF5252',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    gap: 4,
    marginBottom: 12,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButtonContainer: {
    width: 80,
  },
  modalBody: {
    paddingBottom: 20,
  },
  detailCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  detailLargeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 16,
  },
  weatherDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barContainer: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barProgressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
});
