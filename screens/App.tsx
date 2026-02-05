import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WeatherCard } from '../components/WeatherCard';
import { getWeatherIcon } from '../components/WeatherCard';
import { WeatherData } from '../types/weather';
import * as Location from 'expo-location';
import { fetchWeatherData, fetchCoordinates, predictWeather, fetchMunicipalities } from '../utils/weather';
import { usePrefecture } from '../PrefectureContext';
import { cudaRidgeDetection } from '../utils/ridgeDetection';
import wanakana from 'wanakana';
import { t, setLanguage, getCurrentLanguage } from '../utils/i18n';


type PrefectureData = {
  [key: string]: {
    name: string;
    lat: string;
    lng: string;
  };
};

const PREFECTURE_DATA: PrefectureData = {
  '01': { name: '北海道', lat: '43.064615', lng: '141.346807' },
  '02': { name: '青森県', lat: '40.824308', lng: '140.740059' },
  '03': { name: '岩手県', lat: '39.703619', lng: '141.152684' },
  '04': { name: '宮城県', lat: '38.268837', lng: '140.872183' },
  '05': { name: '秋田県', lat: '39.718614', lng: '140.102364' },
  '06': { name: '山形県', lat: '38.240436', lng: '140.363633' },
  '07': { name: '福島県', lat: '37.750299', lng: '140.467551' },
  '08': { name: '茨城県', lat: '36.341813', lng: '140.446793' },
  '09': { name: '栃木県', lat: '36.565725', lng: '139.883565' },
  '10': { name: '群馬県', lat: '36.390668', lng: '139.060406' },
  '11': { name: '埼玉県', lat: '35.857428', lng: '139.648933' },
  '12': { name: '千葉県', lat: '35.605058', lng: '140.123308' },
  '13': { name: '東京都', lat: '35.689488', lng: '139.691706' },
  '14': { name: '神奈川県', lat: '35.447507', lng: '139.642345' },
  '15': { name: '新潟県', lat: '37.902552', lng: '139.023095' },
  '16': { name: '富山県', lat: '36.695291', lng: '137.211338' },
  '17': { name: '石川県', lat: '36.594682', lng: '136.625573' },
  '18': { name: '福井県', lat: '36.065178', lng: '136.221527' },
  '19': { name: '山梨県', lat: '35.664158', lng: '138.568449' },
  '20': { name: '長野県', lat: '36.651299', lng: '138.180956' },
  '21': { name: '岐阜県', lat: '35.391227', lng: '136.722291' },
  '22': { name: '静岡県', lat: '34.977049', lng: '138.383084' },
  '23': { name: '愛知県', lat: '35.180188', lng: '136.906565' },
  '24': { name: '三重県', lat: '34.730283', lng: '136.508588' },
  '25': { name: '滋賀県', lat: '35.004531', lng: '135.86859' },
  '26': { name: '京都府', lat: '35.021247', lng: '135.755597' },
  '27': { name: '大阪府', lat: '34.686316', lng: '135.519711' },
  '28': { name: '兵庫県', lat: '34.691269', lng: '135.183071' },
  '29': { name: '奈良県', lat: '34.685334', lng: '135.832742' },
  '30': { name: '和歌山県', lat: '34.226034', lng: '135.167506' },
  '31': { name: '鳥取県', lat: '35.503891', lng: '134.237736' },
  '32': { name: '島根県', lat: '35.472295', lng: '133.050499' },
  '33': { name: '岡山県', lat: '34.661751', lng: '133.934406' },
  '34': { name: '広島県', lat: '34.396601', lng: '132.459595' },
  '35': { name: '山口県', lat: '34.185956', lng: '131.470649' },
  '36': { name: '徳島県', lat: '34.065718', lng: '134.559304' },
  '37': { name: '香川県', lat: '34.340149', lng: '134.043444' },
  '38': { name: '愛媛県', lat: '33.841624', lng: '132.765681' },
  '39': { name: '高知県', lat: '33.559706', lng: '133.531079' },
  '40': { name: '福岡県', lat: '33.606785', lng: '130.418314' },
  '41': { name: '佐賀県', lat: '33.249442', lng: '130.299794' },
  '42': { name: '長崎県', lat: '32.744839', lng: '129.873756' },
  '43': { name: '熊本県', lat: '32.789827', lng: '130.741667' },
  '44': { name: '大分県', lat: '33.238172', lng: '131.612619' },
  '45': { name: '宮崎県', lat: '31.911090', lng: '131.423855' },
  '46': { name: '鹿児島県', lat: '31.560146', lng: '130.557978' },
  '47': { name: '沖縄県', lat: '26.212401', lng: '127.680932' }
};

const TIME_FILTERS = [
  { label: 'すべて', value: 'all' },
  { label: '朝 (6:00〜12:00)', value: 'morning' },
  { label: '午後 (12:00〜18:00)', value: 'afternoon' },
  { label: '夜 (18:00〜6:00)', value: 'night' },
];

function HomeScreen() {
  const prefectureContext = usePrefecture();
  const [selectedPrefecture, setSelectedPrefecture] = useState(prefectureContext?.selectedPrefecture || { name: '東京都', lat: '35.689488', lng: '139.691706' });
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<string[]>([]);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>('all');
  const [weatherDataList, setWeatherDataList] = useState<WeatherData[]>([]);
  const [currentWeather, setCurrentWeather] = useState<WeatherData[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const progressIntervalRef = React.useRef<number | null>(null);
  const [worldMode, setWorldMode] = useState<boolean>(false);
  const [worldCity, setWorldCity] = useState<string>('');
  const [language, setLanguageState] = useState<'ja' | 'en'>(getCurrentLanguage());
  const [error, setError] = useState<string | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [showWeatherDetail, setShowWeatherDetail] = useState<boolean>(false);

  useEffect(() => {
    console.log('selectedMunicipality changed ->', selectedMunicipality);
  }, [selectedMunicipality]);

  // clear progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current as any);
      }
    };
  }, []);

  // Initial weather fetch using prefecture coordinates (on mount) - shows data immediately
  useEffect(() => {
    const fetchInitialWeather = async () => {
      try {
        setLoading(true);
        setLoadingProgress(0);

        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current as any);
        }
        progressIntervalRef.current = setInterval(() => {
          setLoadingProgress(prev => {
            const next = prev + Math.random() * 10;
            return next >= 90 ? 90 : Math.round(next);
          });
        }, 300) as unknown as number;

        const response = await fetchWeatherData(selectedPrefecture.lat, selectedPrefecture.lng);

        if (!response || !response.hourly || !response.hourly.weather_code) {
          throw new Error('Invalid weather data structure');
        }

        const weatherCodeArray = response.hourly.weather_code.map((code) => [code]);
        const { count } = cudaRidgeDetection(weatherCodeArray, 0.5);

        const processedData = response.hourly.time.map((time, index) => {
          const dateTime = new Date(time);
          const predictedWeather = predictWeather(
            response.hourly.weather_code[index],
            response.hourly.temperature_2m[index],
            response.hourly.precipitation_probability[index],
            response.current.relative_humidity_2m,
            response.hourly.wind_speed_10m[index],
            count,
            0.5
          );

          return {
            dateIndex: index,
            date: dateTime.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            }),
            dateTime: dateTime.toLocaleTimeString('ja-JP', {
              hour: 'numeric',
              minute: 'numeric'
            }).replace(':', '時') + '分',
            areaName: `${selectedPrefecture.name}（代表地点）`,
            windSpeed: response.hourly.wind_speed_10m[index].toString(),
            precipitation: response.hourly.precipitation_probability[index],
            temperature: response.hourly.temperature_2m[index],
            predictedWeather,
            prefecture: selectedPrefecture.name,
            actualWeather: response.hourly.weather_code[index].toString(),
            isPredictionCorrect: false,
            latitude: selectedPrefecture.lat,
            longitude: selectedPrefecture.lng,
          };
        });

        setWeatherDataList(processedData);
        setLoadingProgress(100);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current as any);
          progressIntervalRef.current = null;
        }
        setTimeout(() => setLoading(false), 300);
      } catch (err) {
        console.error('Error fetching initial weather:', err);
        setError(err instanceof Error ? err.message : '天気データの取得に失敗しました');
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current as any);
          progressIntervalRef.current = null;
        }
        setLoading(false);
      }
    };

    fetchInitialWeather();
  }, []);

  // When prefecture changes: fetch municipalities and set default municipality only if none selected
  useEffect(() => {
    const fetchMunicipalitiesForPref = async () => {
      try {
        setLoading(true);
        setError(null);

        const municipalitiesData = await fetchMunicipalities(selectedPrefecture.name);
        if (municipalitiesData.error) {
          setError(municipalitiesData.error);
          setLoading(false);
          return;
        }

        setMunicipalities(municipalitiesData.municipalities);

        // Only set selectedMunicipality if user hasn't chosen one or current is not in the new list
        if (!selectedMunicipality || !municipalitiesData.municipalities.includes(selectedMunicipality)) {
          setSelectedMunicipality(municipalitiesData.selectedMunicipality || '');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching municipalities:', err);
        setError(err instanceof Error ? err.message : '市区町村の取得に失敗しました');
        setLoading(false);
      }
    };

    fetchMunicipalitiesForPref();
  }, [selectedPrefecture]);

  // When municipality changes: fetch weather for the selected municipality
  useEffect(() => {
    const fetchWeatherForMunicipality = async () => {
      if (!selectedMunicipality) return;
      try {
        setLoading(true);
        setLoadingProgress(0);

        // start progress ticker
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current as any);
        }
        progressIntervalRef.current = setInterval(() => {
          setLoadingProgress(prev => {
            const next = prev + Math.random() * 10;
            return next >= 90 ? 90 : Math.round(next);
          });
        }, 300) as unknown as number;
        setError(null);

        const coordinates = await fetchCoordinates(selectedMunicipality);
        const response = await fetchWeatherData(coordinates.lat, coordinates.lon);

        if (!response || !response.hourly || !response.hourly.weather_code) {
          throw new Error('Invalid weather data structure');
        }

        const weatherCodeArray = response.hourly.weather_code.map((code) => [code]);
        const { count } = cudaRidgeDetection(weatherCodeArray, 0.5);

        const processedData = response.hourly.time.map((time, index) => {
          const dateTime = new Date(time);
          const predictedWeather = predictWeather(
            response.hourly.weather_code[index],
            response.hourly.temperature_2m[index],
            response.hourly.precipitation_probability[index],
            response.current.relative_humidity_2m,
            response.hourly.wind_speed_10m[index],
            count,
            0.5
          );

          return {
            dateIndex: index,
            date: dateTime.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            }),
            dateTime: dateTime.toLocaleTimeString('ja-JP', {
              hour: 'numeric',
              minute: 'numeric'
            }).replace(':', '時') + '分',
            areaName: selectedMunicipality.toString(),
            windSpeed: response.hourly.wind_speed_10m[index].toString(),
            precipitation: response.hourly.precipitation_probability[index],
            temperature: response.hourly.temperature_2m[index],
            predictedWeather,
            prefecture: selectedPrefecture.name,
            actualWeather: response.hourly.weather_code[index].toString(),
            isPredictionCorrect: false,
            latitude: selectedPrefecture.lat,
            longitude: selectedPrefecture.lng,
          };
        });

        setWeatherDataList(processedData);

        // complete progress
        setLoadingProgress(100);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current as any);
          progressIntervalRef.current = null;
        }

        // small delay for UX
        setTimeout(() => setLoading(false), 300);
      } catch (err) {
        console.error('Error fetching weather for municipality:', err);
        setError(err instanceof Error ? err.message : '天気データの取得に失敗しました');
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current as any);
          progressIntervalRef.current = null;
        }
        setLoading(false);
      }
    };

    fetchWeatherForMunicipality();
  }, [selectedMunicipality, selectedPrefecture]);

  useEffect(() => {
    const getCurrentLocationWeather = async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('位置情報のアクセスが許可されていません');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const coordinates = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        };

        const municipalitiesData = await fetchMunicipalities(selectedPrefecture.name);
        if (municipalitiesData.error) {
          console.error('Error fetching municipalities:', municipalitiesData.error);
          setLoading(false);
          return;
        }

        setMunicipalities(municipalitiesData.municipalities);
        setSelectedMunicipality(municipalitiesData.selectedMunicipality || '');

        const weatherData = await fetchWeatherData(coordinates.lat.toString(), coordinates.lon.toString());

        if (!weatherData || !weatherData.hourly || !weatherData.hourly.weather_code) {
          throw new Error('Invalid weather data structure from API');
        }

        // Create a 2D array of weather codes for ridge detection
        const weatherCodeArray = weatherData.hourly.weather_code.map((code) => [code]);

        // Use ridge detection to determine if a ridge is detected
        const { count } = cudaRidgeDetection(weatherCodeArray, 0.5);

        const processedData: WeatherData[] = weatherData.hourly.time.map((time, index) => {
          const dateTime = new Date(time);
          const predictedWeather = predictWeather(
            weatherData.hourly.weather_code[index],
            weatherData.hourly.temperature_2m[index],
            weatherData.hourly.precipitation_probability[index],
            weatherData.current.relative_humidity_2m,
            weatherData.hourly.wind_speed_10m[index],
            count,
            0.5
          );

          return {
            dateIndex: index,
            date: dateTime.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            }),
            dateTime: dateTime.toLocaleTimeString('ja-JP', {
              hour: 'numeric',
              minute: 'numeric'
            }).replace(':', '時') + '分',
            areaName: selectedMunicipality,
            windSpeed: weatherData.hourly.wind_speed_10m[index].toString(),
            precipitation: weatherData.hourly.precipitation_probability[index],
            temperature: weatherData.hourly.temperature_2m[index],
            predictedWeather,
            prefecture: selectedPrefecture.name,
            actualWeather: weatherData.hourly.weather_code[index].toString(),
            isPredictionCorrect: false,
            latitude: coordinates.lat.toString(),
            longitude: coordinates.lon.toString(),
          };
        });
        setCurrentWeather(processedData);
      } catch (error) {
        console.error("現在位置の天気データの取得に失敗しました:", error);
        Alert.alert('現在位置の天気データの取得に失敗しました', '位置情報サービスが有効になっていることを確認してください。');
      } finally {
        setLoading(false);
      }
    };
    getCurrentLocationWeather();
  }, []);

  useEffect(() => {
    const filtered = municipalities.filter(municipality => {
      const kanaQuery = wanakana.toKana(searchQuery);
      return municipality.includes(searchQuery) || municipality.includes(kanaQuery) || municipality.toLowerCase().includes(searchQuery.toLowerCase());
    });
    const sorted = filtered.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.localeCompare(b, 'ja');
      } else {
        return b.localeCompare(a, 'ja');
      }
    });
    setFilteredMunicipalities(sorted);
  }, [searchQuery, sortOrder, municipalities]);

  const filteredWeatherData = weatherDataList.filter((data) => {
    const hour = parseInt(data.dateTime.split('時')[0], 10);
    switch (selectedTimeFilter) {
      case 'morning':
        return hour >= 6 && hour < 12;
      case 'afternoon':
        return hour >= 12 && hour < 18;
      case 'night':
        return hour >= 18 || hour < 6;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Language Switch */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>🌤️ {t('common.loading').split('...')[0]}</Text>
        <Button
          title={language === 'ja' ? '🇯🇵' : '🇬🇧'}
          onPress={() => {
            const newLang = language === 'ja' ? 'en' : 'ja';
            setLanguageState(newLang);
            setLanguage(newLang);
          }}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Filter Card */}
        <View style={styles.filterCard}>
          <Text style={styles.sectionTitle}>📍 {t('prefecture.label')}</Text>
          <Picker
            selectedValue={
              Object.entries(PREFECTURE_DATA).find(([code, d]) => d.name === selectedPrefecture.name)?.[0] || Object.keys(PREFECTURE_DATA)[12]
            }
            onValueChange={(value: string) => {
              const prefData = PREFECTURE_DATA[value];
              if (prefData) {
                const newPref = {
                  name: prefData.name,
                  lat: prefData.lat,
                  lng: prefData.lng,
                };
                setSelectedPrefecture(newPref);
                if (prefectureContext && typeof prefectureContext.setSelectedPrefecture === 'function') {
                  prefectureContext.setSelectedPrefecture(newPref);
                }
              }
            }}
            style={styles.pickerCompact}
          >
            {Object.entries(PREFECTURE_DATA).map(([code, data]) => (
              <Picker.Item key={code} label={data.name} value={code} />
            ))}
          </Picker>

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>🏙️ {t('municipality.label')}</Text>
          <TextInput
            style={styles.searchInputCompact}
            placeholder={t('municipality.placeholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.sortButtonsCompact}>
            <Button title={t('municipality.ascending')} onPress={() => setSortOrder('asc')} />
            <Button title={t('municipality.descending')} onPress={() => setSortOrder('desc')} />
          </View>
          <Picker
            selectedValue={selectedMunicipality}
            onValueChange={(value: string) => {
              console.log('Municipality Picker onValueChange:', value);
              setSelectedMunicipality(value);
            }}
            style={styles.pickerCompact}
          >
            {filteredMunicipalities.map((municipality, index) => (
              <Picker.Item key={index} label={municipality} value={municipality} />
            ))}
          </Picker>

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>⏰ {t('timeFilter.label')}</Text>
          <Picker
            selectedValue={selectedTimeFilter}
            onValueChange={(value: string) => setSelectedTimeFilter(value)}
            style={styles.pickerCompact}
          >
            {TIME_FILTERS.map((filter) => (
              <Picker.Item key={filter.value} label={filter.label} value={filter.value} />
            ))}
          </Picker>
        </View>

        {/* World Mode Card */}
        <View style={styles.worldModeCard}>
          <Button 
            title={worldMode ? `🌍 ${t('world.modeOn')}` : `🌍 ${t('world.modeOff')}`}
            onPress={() => setWorldMode(prev => !prev)} 
          />
          {worldMode && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                style={styles.searchInputCompact}
                placeholder={t('world.placeholder')}
                value={worldCity}
                onChangeText={setWorldCity}
              />
              <Button 
                title={`🔍 ${t('world.search')}`}
                onPress={() => {
                  if (worldCity.trim()) {
                    setSelectedMunicipality(worldCity.trim());
                  }
                }} 
              />
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {loading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${loadingProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{loadingProgress}% - {t('common.loading')}</Text>
          </View>
        )}

        {/* Weather Cards Section */}
        <View style={styles.weatherSection}>
          <Text style={styles.sectionTitle}>📊 天気予報</Text>
          <View style={styles.weatherCardsContainer}>
            {filteredWeatherData.length > 0 ? (
              filteredWeatherData.map((data, index) => (
                <WeatherCard 
                  key={index} 
                  data={data}
                  onPress={(weatherData) => {
                    setSelectedWeather(weatherData);
                    setShowWeatherDetail(true);
                  }}
                />
              ))
            ) : (
              <Text style={styles.noDataText}>{t('weather.noData')}</Text>
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
              <Text style={styles.modalTitle}>{selectedWeather?.areaName} - 天気詳細</Text>
              <View style={styles.closeButtonContainer}>
                <Button title="閉じる" onPress={() => setShowWeatherDetail(false)} color="#2196F3" />
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedWeather && (
                <View>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>日時</Text>
                    <Text style={styles.detailValue}>{selectedWeather.date} {selectedWeather.dateTime}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>天気</Text>
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
                    <Text style={styles.detailLabel}>気温</Text>
                    <View style={styles.tempContainer}>
                      <View style={styles.tempBox}>
                        <Text style={styles.tempLabel}>予報気温</Text>
                        <Text style={styles.tempValue}>{selectedWeather.temperature.toFixed(1)}°C</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>降水確率</Text>
                    <View style={styles.barContainer}>
                      <View style={[styles.barProgressFill, { width: `${selectedWeather.precipitation}%` }]} />
                    </View>
                    <Text style={styles.detailValue}>{selectedWeather.precipitation}%</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>風速</Text>
                    <Text style={styles.detailValue}>{selectedWeather.windSpeed} m/s</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>都道府県</Text>
                    <Text style={styles.detailValue}>{selectedWeather.prefecture}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>市町村</Text>
                    <Text style={styles.detailValue}>{selectedWeather.areaName}</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    width: '100%',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
  filterCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  worldModeCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 10,
    marginTop: 0,
  },
  pickerCompact: {
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginBottom: 8,
  },
  searchInputCompact: {
    height: 44,
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  sortButtonsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  progressContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  progressBar: {
    height: 6,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  weatherSection: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
  weatherCardsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Legacy styles (kept for compatibility)
  label: {
    fontSize: 12,
    marginBottom: 8,
  },
  picker: {
    flexDirection: 'column',
    height: 50,
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  municipalityContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  selectedText: {
    flexDirection: 'column',
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  selectedItem: {
    backgroundColor: '#e0e0e0',
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
  },
  weatherContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  // Modal Styles
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
  tempContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tempBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
  },
  tempLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  tempValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF5252',
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

export default HomeScreen;