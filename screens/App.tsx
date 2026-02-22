import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { 
  Animated, View, Text, TextInput, Button, StyleSheet, 
  ScrollView, Alert, Modal, Pressable 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';

// 外部コンポーネント・ユーティリティ
import { WeatherCard, getWeatherIcon } from '../components/WeatherCard';
import { WeatherData, WeatherResponse } from '../types/weather';
import { fetchWeatherData, predictWeather, fetchCoordinates, getRegionInfo } from '../utils/weather';
import { usePrefecture } from '../PrefectureContext';
import { t, setLanguage as i18nSetLanguage, getCurrentLanguage } from '../utils/i18n';
import { useLanguage } from '../LanguageContext';
import { registerBackgroundFetchAsync, setupNotificationsAsync } from '../utils/backgroundTasks';
import { City } from '../City';

// --- 型定義 ---
export type Municipality = { 
  name: string; 
  kana: string; 
  lat: string; 
  lon: string; 
};

type PrefectureData = {
  [key: string]: { name: string; lat: string; lng: string; };
};

const PREFECTURE_DATA: PrefectureData = {
  '01': { name: '北海道', lat: '43.064615', lng: '141.346807' }, '02': { name: '青森県', lat: '40.824308', lng: '140.740059' },
  '03': { name: '岩手県', lat: '39.703619', lng: '141.152684' }, '04': { name: '宮城県', lat: '38.268837', lng: '140.872183' },
  '05': { name: '秋田県', lat: '39.718614', lng: '140.102364' }, '06': { name: '山形県', lat: '38.240436', lng: '140.363633' },
  '07': { name: '福島県', lat: '37.750299', lng: '140.467551' }, '08': { name: '茨城県', lat: '36.341813', lng: '140.446793' },
  '09': { name: '栃木県', lat: '36.565725', lng: '139.883565' }, '10': { name: '群馬県', lat: '36.390668', lng: '139.060406' },
  '11': { name: '埼玉県', lat: '35.857428', lng: '139.648933' }, '12': { name: '千葉県', lat: '35.605058', lng: '140.123308' },
  '13': { name: '東京都', lat: '35.689488', lng: '139.691706' }, '14': { name: '神奈川県', lat: '35.447507', lng: '139.642345' },
  '15': { name: '新潟県', lat: '37.902552', lng: '139.023095' }, '16': { name: '富山県', lat: '36.695291', lng: '137.211338' },
  '17': { name: '石川県', lat: '36.594682', lng: '136.625573' }, '18': { name: '福井県', lat: '36.065178', lng: '136.221527' },
  '19': { name: '山梨県', lat: '35.664158', lng: '138.568449' }, '20': { name: '長野県', lat: '36.651299', lng: '138.180956' },
  '21': { name: '岐阜県', lat: '35.391227', lng: '136.722291' }, '22': { name: '静岡県', lat: '34.977049', lng: '138.383084' },
  '23': { name: '愛知県', lat: '35.180188', lng: '136.906565' }, '24': { name: '三重県', lat: '34.730283', lng: '136.508588' },
  '25': { name: '滋賀県', lat: '35.004531', lng: '135.86859' }, '26': { name: '京都府', lat: '35.021247', lng: '135.755597' },
  '27': { name: '大阪府', lat: '34.686316', lng: '135.519711' }, '28': { name: '兵庫県', lat: '34.691269', lng: '135.183071' },
  '29': { name: '奈良県', lat: '34.685334', lng: '135.832742' }, '30': { name: '和歌山県', lat: '34.226034', lng: '135.167506' },
  '31': { name: '鳥取県', lat: '35.503891', lng: '134.237736' }, '32': { name: '島根県', lat: '35.472295', lng: '133.050499' },
  '33': { name: '岡山県', lat: '34.661751', lng: '133.934406' }, '34': { name: '広島県', lat: '34.396601', lng: '132.459595' },
  '35': { name: '山口県', lat: '34.185956', lng: '131.470649' }, '36': { name: '徳島県', lat: '34.065718', lng: '134.559304' },
  '37': { name: '香川県', lat: '34.340149', lng: '134.043444' }, '38': { name: '愛媛県', lat: '33.841624', lng: '132.765681' },
  '39': { name: '高知県', lat: '33.559706', lng: '133.531079' }, '40': { name: '福岡県', lat: '33.606785', lng: '130.418314' },
  '41': { name: '佐賀県', lat: '33.249442', lng: '130.299794' }, '42': { name: '長崎県', lat: '32.744839', lng: '129.873756' },
  '43': { name: '熊本県', lat: '32.789827', lng: '130.741667' }, '44': { name: '大分県', lat: '33.238172', lng: '131.612619' },
  '45': { name: '宮崎県', lat: '31.911090', lng: '131.423855' }, '46': { name: '鹿児島県', lat: '31.560146', lng: '130.557978' },
  '47': { name: '沖縄県', lat: '26.212401', lng: '127.680932' }
};

const prefNameMap = { "Hokkaido": "北海道", "Aomori": "青森県", "Iwate": "岩手県", "Miyagi": "宮城県", "Akita": "秋田県", "Yamagata": "山形県", "Fukushima": "福島県", "Ibaraki": "茨城県", "Tochigi": "栃木県", "Gunma": "群馬県", "Saitama": "埼玉県", "Chiba": "千葉県", "Tokyo": "東京都", "Kanagawa": "神奈川県", "Niigata": "新潟県", "Toyama": "富山県", "Ishikawa": "石川県", "Fukui": "福井県", "Yamanashi": "山梨県", "Nagano": "長野県", "Gifu": "岐阜県", "Shizuoka": "静岡県", "Aichi": "愛知県", "Mie": "三重県", "Shiga": "滋賀県", "Kyoto": "京都府", "Osaka": "大阪府", "Hyogo": "兵庫県", "Nara": "奈良県", "Wakayama": "和歌山県", "Tottori": "鳥取県", "Shimane": "島根県", "Okayama": "岡山県", "Hiroshima": "広島県", "Yamaguchi": "山口県", "Tokushima": "徳島県", "Kagawa": "香川県", "Ehime": "愛媛県", "Kochi": "高知県", "Fukuoka": "福岡県", "Saga": "佐賀県", "Nagasaki": "長崎県", "Kumamoto": "熊本県", "Oita": "大分県", "Miyazaki": "宮崎県", "Kagoshima": "鹿児島県", "Okinawa": "沖縄県" };

// Convert a Japanese prefecture name (from PREFECTURE_DATA) to the localized display name
const getLocalizedPrefName = (jpName: string) => {
  const engKey = Object.keys(prefNameMap).find(k => prefNameMap[k as keyof typeof prefNameMap] === jpName);
  if (engKey) return t(`prefectures.${engKey}`, undefined, jpName);
  return jpName;
};

// TIME_FILTERS is computed inside the component so labels re-evaluate on language change
// 通知の表示設定（フォアグラウンド時）

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const WeatherProgressBar = ({ progress, label }: { progress: number, label: string }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animatedWidth, { toValue: progress, duration: 400, useNativeDriver: false }).start();
  }, [progress]);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.labelRow}>
        <Text style={styles.progressText}>{label}</Text>
        <Text style={styles.percentageText}>{progress}%</Text>
      </View>
      <View style={styles.progressBarTrack}>
        <Animated.View style={[styles.progressFill, { width: animatedWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const prefectureContext = usePrefecture();
  
  // --- States ---
  const [selectedPrefecture, setSelectedPrefecture] = useState(prefectureContext?.selectedPrefecture || PREFECTURE_DATA['13']);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherDataList, setWeatherDataList] = useState<WeatherData[]>([]);
  const [weeklyForecast, setWeeklyForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');
  const { language: ctxLanguage, changeLanguage } = useLanguage();
  const [language, setLanguageState] = useState<'ja' | 'en'>((getCurrentLanguage() as 'ja' | 'en') || (ctxLanguage as 'ja' | 'en'));
  const [error, setError] = useState<string | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [showWeatherDetail, setShowWeatherDetail] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasUserSelectedPrefecture, setHasUserSelectedPrefecture] = useState(false);
  const [hasUserSelectedMunicipality, setHasUserSelectedMunicipality] = useState(false);

  // Recompute time filter labels when language changes
  const TIME_FILTERS = useMemo(() => [
    { label: t('timeFilter.all', undefined, 'すべて'), value: 'all' },
    { label: t('timeFilter.morning', undefined, '朝 (6:00〜12:00)'), value: 'morning' },
    { label: t('timeFilter.afternoon', undefined, '午後 (12:00〜18:00)'), value: 'afternoon' },
    { label: t('timeFilter.night', undefined, '夜 (18:00〜6:00)'), value: 'night' },
  ], [ctxLanguage]);

  // --- 検索用ヘルパー: カタカナをひらがなに統一 ---
  const toHiragana = (str: string) => {
    if (!str) return "";
    return str.replace(/[\u30a1-\u30f6]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });
  };

  // HomeScreen コンポーネント内
  useEffect(() => {
    const setupBackground = async () => {
      // 通知の権限を取得
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('通知権限がありません');
        return;
      }
  
      // バックグラウンドタスクを登録
      await registerBackgroundFetchAsync();
      console.log('🚀 バックグラウンドタスクの登録を試行しました');
    };

    setupBackground();
  }, []);

  // --- 初期化 ---
  useEffect(() => {
    const initApp = async () => {
      await setupNotificationsAsync();
      await registerBackgroundFetchAsync();

      // AsyncStorage から保存された都道府県をロード
      const savedPrefectureName = await AsyncStorage.getItem('selectedPrefecture');
      if (savedPrefectureName) {
        const prefObj = Object.values(PREFECTURE_DATA).find(p => p.name === savedPrefectureName);
        if (prefObj) {
          setSelectedPrefecture(prefObj);
          setHasUserSelectedPrefecture(true); // 保存されていたのでユーザーが選択済み
        }
      }
    };
    initApp();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

      // no-op: ensure not to set error during render
  const loadCities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(10);
      
      const cityUtil = new City(selectedPrefecture.name);
      const regionInfo = getRegionInfo(selectedPrefecture.name);
      if (!regionInfo?.regionNames?.length) return;

      // キャッシュファイル名の末尾を v5 にし、確実に新ロジックで再取得させる
      const fileUri = `${FileSystem.documentDirectory}municipalities_${selectedPrefecture.name}_v5.json`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      let list: Municipality[] = [];

      if (fileInfo.exists) {
        const jsonString = await FileSystem.readAsStringAsync(fileUri);
        const cachedData = JSON.parse(jsonString).municipalities;
        if (cachedData.length > 0 && cachedData[0].kana) {
          list = cachedData;
          console.log(`📂 キャッシュ読込完了: ${selectedPrefecture.name}`);
        }
      }

      if (list.length === 0) {
        console.log(`🌐 座標と「かな」を再構築中...`);
        setLoadingProgress(20);
        
        const fetchedData = await cityUtil.getMunicipalityDetails(
          regionInfo.regionNames[0],
          selectedPrefecture.name,
          regionInfo.regionIds!,
          regionInfo.regionCodes!
        );

        // 超高速バッチ処理（15個ずつ、最小待機時間）
        const batchSize = 15;
        const batches = [];
        for (let i = 0; i < fetchedData.length; i += batchSize) {
          batches.push(fetchedData.slice(i, i + batchSize));
        }

        list = [];
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const batchResults = await Promise.all(
            batch.map(async (item, index) => {
              const globalIndex = batchIndex * batchSize + index;
              if (globalIndex % 15 === 0) setLoadingProgress(20 + Math.floor((globalIndex / fetchedData.length) * 60));

              const name = typeof item === 'string' ? item : item.name;
              const kana = item.kana || name;

              try {
                const coords = await fetchCoordinates(kana, false, selectedPrefecture.name, { lat: selectedPrefecture.lat, lng: selectedPrefecture.lng });
                return { name, kana, lat: coords.lat.toString(), lon: coords.lon.toString() };
              } catch (e) {
                return { name, kana, lat: selectedPrefecture.lat, lon: selectedPrefecture.lng };
              }
            })
          );
          list.push(...batchResults);

          // バッチ間に最小限の待機（APIレート制限回避）
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }

        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify({ municipalities: list }));
      }

      setMunicipalities(list);
      if (list.length > 0) setSelectedMunicipality(list[0]);
      setLoadingProgress(100);
    } catch (err) {
      setError("データ読込エラー");
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, [selectedPrefecture]);

  useEffect(() => { loadCities(); }, [loadCities]);

  // 位置情報から市町村を検出
  useEffect(() => {
    if (municipalities.length === 0 || hasUserSelectedPrefecture || hasUserSelectedMunicipality) return;

    const detectLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let bestLoc = await Location.getLastKnownPositionAsync();

          try {
            const sub = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
              (loc) => {
                if (!bestLoc || (loc.coords.accuracy && loc.coords.accuracy < (bestLoc.coords.accuracy || 1e9))) {
                  bestLoc = loc;
                }
              }
            );

            const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
            await wait(8000);
            await sub.remove();
          } catch (watchErr) {
            console.log('watchPositionAsync not available', watchErr);
          }

          if (bestLoc) {
            try {
              // タイムアウト処理付きで逆地理コーディングを実行
              const reverseGeocodePromise = Location.reverseGeocodeAsync(bestLoc.coords);
              const timeoutPromise = new Promise((_resolve, reject) => 
                setTimeout(() => reject(new Error('Reverse geocode timeout')), 5000)
              );
              
              const rev = await Promise.race([reverseGeocodePromise, timeoutPromise]) as any[];
              
              if (rev && rev[0]) {
                // 都道府県を設定
                const pName = prefNameMap[rev[0].region as keyof typeof prefNameMap];
                const prefObj = Object.values(PREFECTURE_DATA).find(p => p.name === pName);
                if (prefObj && prefObj.name !== selectedPrefecture.name) {
                  setSelectedPrefecture(prefObj);
                  setHasUserSelectedPrefecture(true);
                  AsyncStorage.setItem('selectedPrefecture', prefObj.name).catch(console.error);
                  return;
                }

                // 市町村を検出 - 複数のフィールドを試す
                const municipalityName = rev[0].district || rev[0].city || rev[0].name;
                if (municipalityName && municipalities.length > 0) {
                  // より正確な市町村マッチング
                  let foundMunicipality = municipalities.find(m => m.name === municipalityName);
                  
                  // 完全一致がない場合は部分一致を試す
                  if (!foundMunicipality) {
                    foundMunicipality = municipalities.find(m => 
                      m.name.includes(municipalityName) || municipalityName.includes(m.name.replace(/[市区町村]$/, ''))
                    );
                  }
                  
                  if (foundMunicipality) {
                    setSelectedMunicipality(foundMunicipality);
                    setSearchQuery(foundMunicipality.name);
                    setHasUserSelectedMunicipality(true);
                    console.log(`✅ 市町村自動検出: ${foundMunicipality.name}`);
                  }
                }
              }
            } catch (geocodeErr) {
              console.log("Reverse geocode error (using fallback):", geocodeErr);
              // タイムアウトやエラー時は無言で続行（フォールバックは自動的に最初の市町村が選択されている）
            }
          }
        }
      } catch (e) { console.log("Location Error:", e); }
    };

    detectLocation();
  }, [municipalities, hasUserSelectedPrefecture, hasUserSelectedMunicipality]);

  // --- 天気データ取得 ---
  useEffect(() => {
    if (!selectedMunicipality?.lat || !selectedMunicipality?.lon) return;

    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const response: WeatherResponse = await fetchWeatherData(selectedMunicipality.lat, selectedMunicipality.lon);
        const processed = response.hourly.time.map((time, index) => ({
          dateIndex: index,
          date: new Date(time).toLocaleDateString('ja-JP'),
          dateTime: `${new Date(time).getHours().toString().padStart(2, '0')}時00分`,
          areaName: selectedMunicipality.name,
          windSpeed: response.hourly.wind_speed_10m[index].toString(),
          precipitation: response.hourly.precipitation_probability[index],
          temperature: response.hourly.temperature_2m[index],
          predictedWeather: predictWeather(
            response.hourly.weather_code[index], 
            response.hourly.temperature_2m[index], 
            response.hourly.precipitation_probability[index], 
            response.hourly.wind_speed_10m[index]
          ),
          prefecture: selectedPrefecture.name,
          actualWeather: response.hourly.weather_code[index].toString(),
          isPredictionCorrect: false,
          latitude: selectedMunicipality.lat,
          longitude: selectedMunicipality.lon,
        }));

        // 週間予報の処理（dailyがある場合）
        let weekly: any[] = [];
        try {
          if (response.daily && Array.isArray(response.daily.time)) {
            weekly = response.daily.time.map((d: string, i: number) => {
              const max = response.daily.temperature_2m_max?.[i] ?? null;
              const min = response.daily.temperature_2m_min?.[i] ?? null;
              const precip = response.daily.precipitation_probability_max?.[i] ?? 0;
              const wcode = response.daily.weathercode?.[i] ?? 0;
              const predicted = predictWeather(wcode, (max + min) / 2 || 0, precip, 0);
              return {
                date: d,
                weekday: new Date(d).toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' }),
                max,
                min,
                precipitation: precip,
                weatherCode: wcode,
                predictedWeather: predicted,
              };
            }).slice(0, 7);
          }
        } catch (e) {
          console.warn('Weekly parse error', e);
        }

        if (isMounted) {
          setWeatherDataList(processed);
          setWeeklyForecast(weekly);
          setLoadingProgress(100);
        }
      } catch (err) {
        if (isMounted) setError("天気取得失敗");
        if (isMounted) setError(t('weather.fetchError', undefined, '天気取得失敗'));
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedMunicipality]);

  // --- 高速フィルタリング (漢字 & ひらがな対応) ---
  const filteredMunicipalities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const hiraQuery = toHiragana(query);
    if (!query) return municipalities;

    return municipalities.filter(m => {
      const nameMatch = m.name.includes(query);
      const mKanaHira = toHiragana(m.kana || "");
      const kanaMatch = mKanaHira.includes(hiraQuery);
      return nameMatch || kanaMatch;
    });
  }, [searchQuery, municipalities]);

  const filteredWeatherData = useMemo(() => {
    return weatherDataList.filter(d => {
      const h = parseInt(d.dateTime.split('時')[0], 10);
      if (selectedTimeFilter === 'morning') return h >= 6 && h < 12;
      if (selectedTimeFilter === 'afternoon') return h >= 12 && h < 18;
      if (selectedTimeFilter === 'night') return h >= 18 || h < 6;
      return true;
    });
  }, [weatherDataList, selectedTimeFilter]);

  const heroData = useMemo(() => {
    const currentHour = currentTime.getHours();
    return weatherDataList.find(d => parseInt(d.dateTime.split('時')[0], 10) === currentHour) || null;
  }, [weatherDataList, currentTime]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.appTitle}>{t('app.title')}</Text>
          <Pressable onPress={() => {
            const next = language === 'ja' ? 'en' : 'ja';
            setLanguageState(next);
            i18nSetLanguage(next);
            changeLanguage(next as any);
          }} style={styles.langButton}>
            <Text style={styles.langButtonText}>{language === 'ja' ? t('language.japanese') : t('language.english')}</Text>
          </Pressable>
        </View>
        <Text style={styles.headerSubtitle}>{t('app.subtitle', { prefecture: getLocalizedPrefName(selectedPrefecture.name) })}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true}>
        {loading && <WeatherProgressBar progress={loadingProgress} label={t('common.loading')} />}

        {heroData && (
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <MaterialCommunityIcons name={getWeatherIcon(heroData.predictedWeather)} size={80} color="#1976D2" />
              <View style={styles.heroTextSection}>
                <Text style={styles.heroTemperature}>{heroData.temperature.toFixed(0)}°</Text>
                <Text style={styles.heroWeatherText}>{heroData.predictedWeather}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.filterCard}>
          <Text style={styles.sectionTitle}>{t('prefecture.label')}</Text>
          <Picker 
            selectedValue={Object.entries(PREFECTURE_DATA).find(([_, d]) => d.name === selectedPrefecture.name)?.[0] || '13'}
            onValueChange={(v) => { const p = PREFECTURE_DATA[v]; setSelectedPrefecture(p); setSearchQuery(''); setHasUserSelectedPrefecture(true); setHasUserSelectedMunicipality(false); AsyncStorage.setItem('selectedPrefecture', p.name).catch(console.error); }} 
            style={styles.inputBase}
          >
            {Object.entries(PREFECTURE_DATA).map(([c, d]) => <Picker.Item key={c} label={d.name} value={c} />)}
          </Picker>

          <Text style={styles.sectionTitle}>{t('municipality.label')}</Text>
          <TextInput 
            style={styles.inputBase} 
            placeholder={t('municipality.inputPlaceholderLong')}
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
          
          <Picker
            selectedValue={selectedMunicipality?.kana || ''}
            onValueChange={(v) => {
              const found = municipalities.find(m => m.kana === v);
              if (found) {
                setSelectedMunicipality(found);
                setHasUserSelectedMunicipality(true);
              }
            }}
            style={styles.inputBase}
          >
            {filteredMunicipalities.map((m, i) => (
              <Picker.Item key={i} label={m.name} value={m.kana} />
            ))}
            {filteredMunicipalities.length === 0 && <Picker.Item label={t('municipality.notFound')} value="" />}
          </Picker>

          <Text style={styles.sectionTitle}>{t('timeFilter.label')}</Text>
          <Picker selectedValue={selectedTimeFilter} onValueChange={setSelectedTimeFilter} style={styles.inputBase}>
            {TIME_FILTERS.map((f) => <Picker.Item key={f.value} label={f.label} value={f.value} />)}
          </Picker>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.weeklyContainer}>
          <Text style={styles.sectionTitle}>{t('weekly.title')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeklyScroll} contentContainerStyle={{ paddingHorizontal: 12 }}>
            {weeklyForecast.length > 0 ? weeklyForecast.map((d, i) => (
              <View key={i} style={styles.weeklyCard}>
                <View style={styles.weeklyTopRow}>
                  <Text style={styles.weeklyDate}>{d.weekday}</Text>
                  <Text style={styles.weeklyPrecipSmall}>{Math.round(d.precipitation)}%</Text>
                </View>
                <MaterialCommunityIcons name={getWeatherIcon(d.predictedWeather)} size={44} color="#1976D2" />
                <Text style={styles.weeklyTemp}>{Math.round(d.max)}°</Text>
                <Text style={styles.weeklyTempSmall}>{Math.round(d.min)}°</Text>
                <View style={styles.precipTrack}>
                  <View style={[styles.precipFill, { width: `${Math.min(100, Math.round(d.precipitation))}%` }]} />
                </View>
              </View>
              )) : <Text style={styles.noDataText}>{t('weather.noData')}</Text>}
          </ScrollView>
        </View>

        <View style={styles.weatherSection}>
          <Text style={styles.sectionTitle}>{t('hourly.title')}</Text>
          <View style={styles.weatherCardsContainer}>
            {filteredWeatherData.length > 0 ? filteredWeatherData.map((d, i) => (
              <WeatherCard key={i} data={d} onPress={(item) => { setSelectedWeather(item); setShowWeatherDetail(true); }} />
            )) : <Text style={styles.noDataText}>{t('weather.noData')}</Text>}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showWeatherDetail} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('detail.title', { area: selectedWeather?.areaName || '' })}</Text>
              <Button title={t('common.close')} onPress={() => setShowWeatherDetail(false)} color="#1976D2" />
            </View>
            {selectedWeather && (
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>{t('detail.date')} {selectedWeather.date} {selectedWeather.dateTime}</Text>
                <View style={styles.weatherDetailRow}>
                  <MaterialCommunityIcons name={getWeatherIcon(selectedWeather.predictedWeather)} size={48} color="#FF9800" />
                  <Text style={styles.detailLargeValue}>{selectedWeather.predictedWeather}</Text>
                </View>
                <Text style={styles.detailValue}>{t('detail.temperature')} {selectedWeather.temperature}°C</Text>
                <Text style={styles.detailValue}>{t('detail.precipitation')} {selectedWeather.precipitation}%</Text>
                <Text style={styles.detailValue}>{t('detail.wind')} {selectedWeather.windSpeed}m/s</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#1976D2', padding: 16, paddingTop: 50, elevation: 5 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  appTitle: { fontSize: 28, fontWeight: '700', color: 'white' },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  langButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  langButtonText: { color: 'white', fontWeight: '600' },
  heroCard: { backgroundColor: 'white', margin: 12, padding: 24, borderRadius: 20, elevation: 5 },
  heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  heroTextSection: { alignItems: 'flex-start' },
  heroTemperature: { fontSize: 54, fontWeight: '800', color: '#1976D2' },
  heroWeatherText: { fontSize: 18, fontWeight: '600', color: '#424242' },
  filterCard: { backgroundColor: 'white', margin: 12, padding: 18, borderRadius: 14, elevation: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1976D2', marginBottom: 8, marginLeft: 4 },
  inputBase: { height: 48, backgroundColor: '#F5F5F5', borderRadius: 10, marginBottom: 12, paddingHorizontal: 10 },
  weatherSection: { paddingBottom: 20 },
  weatherCardsContainer: { paddingHorizontal: 12 },
  weeklyContainer: { marginTop: 8, paddingBottom: 8 },
  weeklyScroll: { marginBottom: 6 },
  weeklyCard: { width: 110, backgroundColor: 'white', marginRight: 12, padding: 12, borderRadius: 12, alignItems: 'center', elevation: 3 },
  weeklyTopRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  weeklyDate: { fontSize: 12, color: '#666' },
  weeklyPrecipSmall: { fontSize: 12, color: '#1976D2', fontWeight: '700' },
  weeklyTemp: { fontSize: 18, fontWeight: '800', marginTop: 6, color: '#222' },
  weeklyTempSmall: { fontSize: 12, color: '#777' },
  precipTrack: { width: '100%', height: 6, backgroundColor: '#EEE', borderRadius: 6, marginTop: 8, overflow: 'hidden' },
  precipFill: { height: '100%', backgroundColor: '#1976D2' },
  progressContainer: { width: '100%', paddingHorizontal: 20, marginVertical: 15 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 14, color: '#666' },
  percentageText: { fontSize: 12, color: '#007AFF', fontWeight: '700' },
  progressBarTrack: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#007AFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  detailCard: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16 },
  detailLabel: { fontSize: 14, color: '#1565C0', marginBottom: 8 },
  detailValue: { fontSize: 16, marginTop: 4 },
  weatherDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  detailLargeValue: { fontSize: 28, fontWeight: '800' },
  errorText: { color: 'red', textAlign: 'center', margin: 10 },
  noDataText: { color: '#999', textAlign: 'center', marginTop: 20 },
});