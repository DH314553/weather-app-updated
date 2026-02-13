import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, Modal, Pressable, AppState } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WeatherCard } from '../components/WeatherCard';
import { getWeatherIcon } from '../components/WeatherCard';
import { WeatherData } from '../types/weather';
import * as Location from 'expo-location';
import { fetchWeatherData, fetchCoordinates, predictWeather, fetchMunicipalities } from '../utils/weather';
import { usePrefecture } from '../PrefectureContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cudaRidgeDetection } from '../utils/ridgeDetection';
import * as FileSystem from 'expo-file-system';
import { t, setLanguage, getCurrentLanguage } from '../utils/i18n';
import { getRegionInfo } from '../utils/weather';
import { City } from '../City';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, scheduleWeatherNotification } from '../utils/notifications';


type PrefectureData = {
  [key: string]: {
    name: string;
    lat: string;
    lng: string;
  };
};

export type Municipality = {
  name: string;
  kana: string;
};

export type MunicipalityResponse = {
  municipalities: Municipality[];
  selectedMunicipality: string | null;
  error: string | null;
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

const prefNameMap = {
  "Hokkaido": "北海道",
  "Aomori": "青森県",
  "Iwate": "岩手県",
  "Miyagi": "宮城県",
  "Akita": "秋田県",
  "Yamagata": "山形県",
  "Fukushima": "福島県",
  "Ibaraki": "茨城県",
  "Tochigi": "栃木県",
  "Gunma": "群馬県",
  "Saitama": "埼玉県",
  "Chiba": "千葉県",
  "Tokyo": "東京都",
  "Kanagawa": "神奈川県",
  "Niigata": "新潟県",
  "Toyama": "富山県",
  "Ishikawa": "石川県",
  "Fukui": "福井県",
  "Yamanashi": "山梨県",
  "Nagano": "長野県",
  "Gifu": "岐阜県",
  "Shizuoka": "静岡県",
  "Aichi": "愛知県",
  "Mie": "三重県",
  "Shiga": "滋賀県",
  "Kyoto": "京都府",
  "Osaka": "大阪府",
  "Hyogo": "兵庫県",
  "Nara": "奈良県",
  "Wakayama": "和歌山県",
  "Tottori": "鳥取県",
  "Shimane": "島根県",
  "Okayama": "岡山県",
  "Hiroshima": "広島県",
  "Yamaguchi": "山口県",
  "Tokushima": "徳島県",
  "Kagawa": "香川県",
  "Ehime": "愛媛県",
  "Kochi": "高知県",
  "Fukuoka": "福岡県",
  "Saga": "佐賀県",
  "Nagasaki": "長崎県",
  "Kumamoto": "熊本県",
  "Oita": "大分県",
  "Miyazaki": "宮崎県",
  "Kagoshima": "鹿児島県",
  "Okinawa": "沖縄県"
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
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  // ステート宣言の部分をこのように修正（または確認）
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<Municipality[]>([]);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>('all');
  const [weatherDataList, setWeatherDataList] = useState<WeatherData[]>([]);
  const [currentWeather, setCurrentWeather] = useState<WeatherData[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const progressIntervalRef = React.useRef<number | null>(null);
  // world mode removed
  const [language, setLanguageState] = useState<'ja' | 'en'>((getCurrentLanguage() as 'ja' | 'en') || 'ja');
  const [error, setError] = useState<string | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [showWeatherDetail, setShowWeatherDetail] = useState<boolean>(false);
  const [nowIndex, setNowIndex] = useState<number>(0);
  const nowIntervalRef = React.useRef<number | null>(null);
  const municipalityRequestId = React.useRef(0);

  useEffect(() => {
    console.log('selectedMunicipality changed ->', selectedMunicipality?.name);
  }, [selectedMunicipality?.name]);

  // clear progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current as any);
      }
    };
  }, []);

  // Sync local selectedPrefecture with PrefectureContext changes made elsewhere
  useEffect(() => {
    if (prefectureContext && prefectureContext.selectedPrefecture) {
      const ctx = prefectureContext.selectedPrefecture;
      const local = selectedPrefecture;
      if (JSON.stringify(ctx) !== JSON.stringify(local)) {
        setSelectedPrefecture(ctx);
      }
    }
  }, [prefectureContext?.selectedPrefecture]);

  // weather専用にコンポーネント直下で定義しておく
// const weatherRequestId = React.useRef(0);

// When municipality changes: fetch weather for the selected municipality
  useEffect(() => {
  const fetchWeather = async () => {
    if (!selectedMunicipality) return;

    try {
      setLoading(true);
      setError(null);

      // 1. プロパティの存在を完全に「文字列」としてチェックして取得
      // これにより ReferenceError (Property doesn't exist) を回避します
      let municipalityName = "";
      let searchKey = "";

      if (typeof selectedMunicipality === 'object') {
        // オブジェクトの場合、ブラケット記法で安全に取得
        municipalityName = (selectedMunicipality as any)["name"] || "";
        searchKey = (selectedMunicipality as any)["kana"] || municipalityName;
      } else {
        // 文字列の場合
        municipalityName = selectedMunicipality;
        searchKey = selectedMunicipality;
      }

      if (!municipalityName) {
        setLoading(false);
        return;
      }

      console.log(`Fetching weather for: ${municipalityName} (Key: ${searchKey})`);

      // 2. 座標取得
      const coordinates = await fetchCoordinates(searchKey);

      // 3. 天気データ取得
      const response = await fetchWeatherData(
        coordinates.lat,
        coordinates.lon
      );

      if (!response?.hourly?.weather_code) {
        throw new Error('Invalid weather data structure');
      }

      const processed = response.hourly.time.map((time: string, index: number) => {
        const dateTime = new Date(time);
        const predictedWeather = predictWeather(
          response.hourly.weather_code[index],
          response.hourly.temperature_2m[index],
          response.hourly.precipitation_probability[index],
          response.hourly.wind_speed_10m[index]
        );

        return {
          dateIndex: index,
          date: dateTime.toLocaleDateString('ja-JP'),
          dateTime: `${dateTime.getHours()}時${dateTime.getMinutes()}分`,
          areaName: municipalityName,
          windSpeed: response.hourly.wind_speed_10m[index].toString(),
          precipitation: response.hourly.precipitation_probability[index],
          temperature: response.hourly.temperature_2m[index],
          predictedWeather,
          prefecture: typeof selectedPrefecture === 'object' ? (selectedPrefecture as any).name : selectedPrefecture,
          actualWeather: response.hourly.weather_code[index].toString(),
          isPredictionCorrect: false,
          latitude: coordinates.lat,
          longitude: coordinates.lon,
        };
      });

      setWeatherDataList(processed);

    } catch (err) {
      console.error("Weather fetch error details:", err);
      setError('天気取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  fetchWeather();
  }, [selectedMunicipality]);
  // Extracted function so we can call it on demand (on mount and when app resumes)
  const getCurrentLocationWeather = async () => {
    try {
      setLoading(true);
      // 1. 位置情報の権限リクエスト
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('許可設定が必要です', 'アプリの設定から位置情報を許可してください。');
        setLoading(false);
        return;
      }

      // 2. 現在地の座標を取得
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;


      // 3. 逆ジオコーディングで都道府県・市区町村名を取得
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      let detectedPref = null;
      let detectedCity = null;
      if (reverseGeocode && reverseGeocode.length > 0) {
        // 都道府県名const municipalityRequestId = React.useRef(0);

        detectedPref = prefNameMap[reverseGeocode[0].region as keyof typeof prefNameMap];

        // 市区町村名
        detectedCity = reverseGeocode[0].city || reverseGeocode[0].subregion || reverseGeocode[0].district || reverseGeocode[0].name;
      }
      console.log('DEBUG: detectedPref:', detectedPref);
      console.log('DEBUG: PREFECTURE_DATA names:', Object.values(PREFECTURE_DATA).map(p => p.name));

      // PrefectureContextとローカルstateを常に更新（都道府県が変わった場合も）
      if (detectedPref && PREFECTURE_DATA) {
        const prefEntry = Object.values(PREFECTURE_DATA).find(p => p.name === detectedPref);
        if (prefEntry) {
          if (prefectureContext && typeof prefectureContext.setSelectedPrefecture === 'function') {
            prefectureContext.setSelectedPrefecture({ name: detectedPref, lat: prefEntry.lat, lng: prefEntry.lng });
          }
          setSelectedPrefecture({ name: detectedPref, lat: prefEntry.lat, lng: prefEntry.lng });
        }
      }

      // 市区町村リスト取得
      const municipalitiesData = await fetchMunicipalities(detectedPref || selectedPrefecture.name);
      if (municipalitiesData.error) {
        console.error('Error fetching municipalities:', municipalitiesData.error);
        setLoading(false);
        return;
      }
      setMunicipalities(municipalitiesData.municipalities.map((name) => ({
       name,
       kana: "", // APIがkanaを返さないなら空
      }))); // kana is empty as we don't have it from fetchMunicipalities
      // 市区町村名がリストにあれば選択、なければ部分一致で最も近いものを選択
      let selectedCity = '';
      if (detectedCity) {
        if (municipalitiesData.municipalities.includes(detectedCity)) {
          selectedCity = detectedCity;
        } else {
          // 部分一致（例: 佐賀→佐賀市、唐津→唐津市など）
          const match = municipalitiesData.municipalities.find(m => m.startsWith(detectedCity));
          if (match) {
            selectedCity = match;
          } else {
            // サフィックス一致（例: ...市, ...町, ...村, ...区, ...島）
            const suffixMatch = municipalitiesData.municipalities.find(m => m.includes(detectedCity));
            if (suffixMatch) {
              selectedCity = suffixMatch;
            }
          }
        }
      }
      setSelectedMunicipality(selectedCity ? { name: selectedCity, kana: "" } : null);

      console.log('Detected city for weather fetch:', selectedCity);

      const weatherData = await fetchWeatherData(latitude.toString(), longitude.toString());

      console.log('Current location weather data:', weatherData);

      if (!weatherData || !weatherData.hourly || !weatherData.hourly.weather_code) {
        throw new Error('Invalid weather data structure from API');
      }

      // const weatherCodeArray = weatherData.hourly.weather_code.map((code) => [code]);
      // const { count } = cudaRidgeDetection(weatherCodeArray, 0.5);

      const processedData: WeatherData[] = weatherData.hourly.time.map((time, index) => {
        const dateTime = new Date(time);
        const predictedWeather = predictWeather(
          weatherData.hourly.weather_code[index],
          weatherData.hourly.temperature_2m[index],
          weatherData.hourly.precipitation_probability[index],
          // weatherData.current.relative_humidity_2m,
          weatherData.hourly.wind_speed_10m[index],
          // count,
          // 0.5
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
          areaName: selectedMunicipality?.name || '',
          windSpeed: weatherData.hourly.wind_speed_10m[index].toString(),
          precipitation: weatherData.hourly.precipitation_probability[index],
          temperature: weatherData.hourly.temperature_2m[index],
          predictedWeather,
          prefecture: selectedPrefecture.name,
          actualWeather: weatherData.hourly.weather_code[index].toString(),
          isPredictionCorrect: false,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
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

  // Call once on mount
  useEffect(() => {
    getCurrentLocationWeather();

    // Listen to app resume and refresh location if user enabled useCurrentLocation
    const handleAppStateChange = async (nextAppState: any) => {
      if (nextAppState === 'active') {
        try {
          const useCurrent = await AsyncStorage.getItem('useCurrentLocation');
          if (useCurrent && JSON.parse(useCurrent)) {
            getCurrentLocationWeather();
          }
        } catch (e) {
          console.error('Error checking useCurrentLocation flag:', e);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange as any);

    return () => {
      subscription.remove();
    };
  }, []);

  // Update hero to reflect current time (real-time). Picks the hourly entry matching current hour.
  useEffect(() => {
    const activeArray = (weatherDataList && weatherDataList.length > 0) ? weatherDataList : currentWeather;
    if (!activeArray || activeArray.length === 0) return;

    const updateNowIndex = () => {
      const now = new Date();
      const hour = now.getHours();

      let idx = activeArray.findIndex(item => {
        const h = parseInt(item.dateTime.split('時')[0], 10);
        return h === hour;
      });

      if (idx === -1) {
        // fallback: find closest hour
        idx = 0;
        let minDiff = Infinity;
        activeArray.forEach((item, i) => {
          const h = parseInt(item.dateTime.split('時')[0], 10);
          const diff = Math.min(Math.abs(h - hour), Math.abs(h + 24 - hour), Math.abs(h - (hour + 24)));
          if (diff < minDiff) { minDiff = diff; idx = i; }
        });
      }

      setNowIndex(idx);
    };

    updateNowIndex();
    if (nowIntervalRef.current) {
      clearInterval(nowIntervalRef.current as any);
    }
    nowIntervalRef.current = setInterval(updateNowIndex, 60 * 1000) as unknown as number;

    return () => {
      if (nowIntervalRef.current) {
        clearInterval(nowIntervalRef.current as any);
        nowIntervalRef.current = null;
      }
    };
  }, [currentWeather, weatherDataList]);


  const loadMunicipalityData = async () => {
    if (!selectedPrefecture) return;

    try {
      const prefName =
        typeof selectedPrefecture === 'object'
          ? selectedPrefecture.name
          : selectedPrefecture;

      if (!prefName) return;

      const fileName = `municipalities_${prefName}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      console.log("📂 Checking:", fileUri);

      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      // ===============================
      // ✅ ① JSONキャッシュあり
      // ===============================
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(fileUri);
        const parsedData = JSON.parse(content);

        const data = parsedData.municipalities ?? [];

        setMunicipalities(data);
        setFilteredMunicipalities(data);

        // 🔥 ここが超重要
        if (data.length > 0) {
          setSelectedMunicipality(data[0]);
        }

        console.log("✅ Loaded from cache");
        return;
      }

      // ===============================
      // ❌ ② API取得
      // ===============================
      console.log("⚠ JSON not found. Fetching from J-LIS...");

      const regionInfo = getRegionInfo(prefName);
      if (!regionInfo?.regionNames) return;

      const city = new City(prefName);

      const municipalities = await city.getMunicipalityDetails(
        regionInfo.regionNames[0],
        prefName,
        regionInfo.regionIds!,
        regionInfo.regionCodes!,
      );

      if (!municipalities?.length) {
        console.warn("No municipalities fetched.");
        return;
      }

      setMunicipalities(municipalities);
      setFilteredMunicipalities(municipalities);

      // 🔥 自動選択（超重要）
      setSelectedMunicipality(municipalities[0]);

      await city.saveMunicipalityJson(
        regionInfo.regionNames[0],
        prefName,
        regionInfo.regionIds!,
        regionInfo.regionCodes!
      );

      console.log("💾 JSON generated and saved.");

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("🛑 Previous municipality fetch aborted");
      } else {
        console.error("Failed to load municipality data:", error);
      }
    }
  };

  // 修正後（都道府県が変わった時に、一旦リストを空にしてリセットする）
  useEffect(() => {
    setWeatherDataList([]);
    setSelectedMunicipality(null); // 一旦クリア
    loadMunicipalityData();
  }, [selectedPrefecture]);

  // 2. 検索ロジック（ひらがな・カタカナ・漢字対応）
  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setFilteredMunicipalities(municipalities);
      return;
    }

    const toHira = (str: string) =>
      str.replace(/[\u30a1-\u30f6]/g, (match) =>
        String.fromCharCode(match.charCodeAt(0) - 0x60)
      );

    const queryHira = toHira(query);

    const filtered = municipalities.filter((m) => {
      const name = m.name ?? "";
      const kana = m.kana ?? "";

      return (
        name.includes(query) ||
        kana.includes(query) ||
        toHira(kana).includes(queryHira)
      );
    });

    const sorted = filtered.sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name, "ja")
        : b.name.localeCompare(a.name, "ja")
    );

    setFilteredMunicipalities(sorted);
  }, [searchQuery, municipalities, sortOrder]);

  useEffect(() => {
  municipalityRequestId.current++; // 古いfetch無効化
  }, [selectedPrefecture]);



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

  const activeArray = (weatherDataList && weatherDataList.length > 0) ? weatherDataList : currentWeather;
  const heroData = activeArray && activeArray.length > 0 ? (activeArray[nowIndex] ?? activeArray[0]) : null;

  if (loading) {
  return (
    <View style={styles.centered}>
      <Text style={styles.text}>データを読み込んでいます...</Text>
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${loadingProgress}%` }]}
        />
      </View>

    </View>
  )};


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
        <View style={styles.headerTopRow}>
          <Text style={styles.appTitle}>天気予報</Text>
          <Pressable
            onPress={() => {
              const newLang = language === 'ja' ? 'en' : 'ja';
              setLanguageState(newLang);
              setLanguage(newLang);
            }}
            style={({ pressed }: any) => [
              styles.langButton,
              pressed && styles.langButtonPressed
            ]}
          >
            <Text style={styles.langButtonText}>{language === 'ja' ? '日本語' : 'English'}</Text>
          </Pressable>
        </View>
        <Text style={styles.headerSubtitle}>{selectedPrefecture.name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Current Weather Hero Section */}
        {heroData && (
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <MaterialCommunityIcons
                name={getWeatherIcon(heroData.predictedWeather)}
                size={80}
                color="#1976D2"
              />
              <View style={styles.heroTextSection}>
                <Text style={styles.heroTemperature}>{heroData.temperature.toFixed(0)}°</Text>
                <Text style={styles.heroWeatherText}>{heroData.predictedWeather}</Text>
              </View>
            </View>
            <View style={styles.heroFooter}>
              <View style={styles.heroInfoRow}>
                <MaterialCommunityIcons name="water-percent" size={18} color="#1976D2" />
                <Text style={styles.heroInfoText}>{heroData.precipitation}%</Text>
              </View>
              <View style={styles.heroInfoRow}>
                <MaterialCommunityIcons name="weather-windy" size={18} color="#1976D2" />
                <Text style={styles.heroInfoText}>{heroData.windSpeed} m/s</Text>
              </View>
              <View style={styles.heroInfoRow}>
                <MaterialCommunityIcons name="clock" size={18} color="#1976D2" />
                <Text style={styles.heroInfoText}>{new Date().toLocaleTimeString('ja-JP', { hour: 'numeric', minute: 'numeric' }).replace(':','時') + '分'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter Card */}
        <View style={styles.filterCard}>
          <Text style={styles.sectionTitle}>{t('prefecture.label')}</Text>
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

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t('municipality.label')}</Text>
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
            selectedValue={selectedMunicipality?.name || ''}
            onValueChange={(value: string) => {
              // value は municipality.name が入ってくるように修正
              const found = filteredMunicipalities.find(m => m.name === value);
              if (found) {
                setSelectedMunicipality(found);
              }
            }}
            style={styles.pickerCompact}
          >
            {filteredMunicipalities.map((municipality, index) => (
              <Picker.Item
                key={index}
                label={municipality.name}
                value={municipality.name} // ここを kana から name に変更
              />
            ))}
          </Picker>

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t('timeFilter.label')}</Text>
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

        {/* World mode feature removed */}

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
                        <MaterialCommunityIcons name="thermometer" size={24} color="#FF5252" />
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
                    <Text style={styles.detailValue}>{selectedWeather.precipitation}% の確率で雨</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>風速</Text>
                    <View style={styles.windSpeedDisplay}>
                      <MaterialCommunityIcons name="weather-windy" size={24} color="#1976D2" />
                      <Text style={styles.detailValue}>{selectedWeather.windSpeed} m/s</Text>
                    </View>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>場所情報</Text>
                    <Text style={styles.detailValue}>{selectedWeather.prefecture}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  langButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  langButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  heroCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  heroTextSection: {
    alignItems: 'flex-start',
  },
  heroTemperature: {
    fontSize: 54,
    fontWeight: '800',
    color: '#1976D2',
    lineHeight: 58,
  },
  heroWeatherText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginTop: 4,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  heroInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
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
    marginVertical: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderTopWidth: 3,
    borderTopColor: '#1976D2',
  },
  worldModeCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderTopWidth: 3,
    borderTopColor: '#F57C00',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 12,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  pickerCompact: {
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInputCompact: {
    height: 48,
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#424242',
  },
  sortButtonsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
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
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    marginHorizontal: 12,
    marginVertical: 8,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1976D2',
    flex: 1,
  },
  closeButtonContainer: {
    width: 80,
  },
  modalBody: {
    paddingBottom: 20,
  },
  detailCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 5,
    borderLeftColor: '#1976D2',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 17,
    color: '#1A237E',
    fontWeight: '600',
  },
  detailLargeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1976D2',
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
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E8FF',
  },
  tempLabel: {
    fontSize: 12,
    color: '#546E7A',
    marginBottom: 8,
    marginTop: 4,
    fontWeight: '500',
  },
  tempValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FF5252',
  },
  barContainer: {
    height: 24,
    backgroundColor: '#E8EAED',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barProgressFill: {
    height: '100%',
    backgroundColor: '#42A5F5',
  },
  windSpeedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
});

export default HomeScreen;
