import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Button, Alert, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  registerForPushNotificationsAsync,
  scheduleWeatherNotification,
} from '../utils/notifications';
import { predictWeather} from '../utils/weather'
import { fetchWeatherData, fetchCoordinates } from '../utils/weather';
import { usePrefecture } from '../PrefectureContext';
import {
  registerBackgroundFetchAsync,
  unregisterBackgroundFetchAsync,
} from '../utils/backgroundTasks';
import { t } from '../utils/i18n';
import { useLanguage } from '../LanguageContext';

type Language = 'ja' | 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ko';

function SettingsScreen() {
  const [is24Hour, setIs24Hour] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  const { language, changeLanguage } = useLanguage();
  const { selectedPrefecture } = usePrefecture();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [
        savedIs24Hour,
        savedIsNotificationsEnabled,
        savedUseCurrentLocation,
        savedLanguage,
      ] = await Promise.all([
        AsyncStorage.getItem('is24Hour'),
        AsyncStorage.getItem('isNotificationsEnabled'),
        AsyncStorage.getItem('useCurrentLocation'),
        AsyncStorage.getItem('language'),
      ]);

      if (savedIs24Hour) setIs24Hour(JSON.parse(savedIs24Hour));
      if (savedIsNotificationsEnabled)
        setIsNotificationsEnabled(JSON.parse(savedIsNotificationsEnabled));
      if (savedUseCurrentLocation)
        setUseCurrentLocation(JSON.parse(savedUseCurrentLocation));
      if (savedLanguage) changeLanguage(savedLanguage as Language);
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.multiSet([
        ['is24Hour', JSON.stringify(is24Hour)],
        ['isNotificationsEnabled', JSON.stringify(isNotificationsEnabled)],
        ['useCurrentLocation', JSON.stringify(useCurrentLocation)],
        ['language', language],
      ]);
      Alert.alert(t('common.success', 'Success'), t('settings.saved', 'Settings saved!'));
    } catch {
      Alert.alert(t('common.error', 'Error'));
    }
  };

  const toggleNotificationsSwitch = async () => {
    const next = !isNotificationsEnabled;

    if (next) {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        Alert.alert('Error', 'Notification permission required.');
        return;
      }
      await registerBackgroundFetchAsync();
      setIsNotificationsEnabled(true);
    } else {
      await unregisterBackgroundFetchAsync();
      await Notifications.cancelAllScheduledNotificationsAsync();
      setIsNotificationsEnabled(false);
    }
  };

  const toggleUseCurrentLocation = async () => {
    if (!useCurrentLocation) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission required.');
        return;
      }
    }
    setUseCurrentLocation(v => !v);
  };

  const handleManualNotification = async () => {
    try {
      let lat: string;
      let lon: string;

      if (useCurrentLocation) {
        const location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude.toString();
        lon = location.coords.longitude.toString();
      } else if (selectedPrefecture) {
        const coords = await fetchCoordinates(selectedPrefecture.name);
        lat = coords.lat;
        lon = coords.lon;
      } else {
        Alert.alert('Error', 'Select prefecture.');
        return;
      }

      const weather = await fetchWeatherData(lat, lon);

      // 🔥 今から10秒後に必ず鳴らす
      const notifyAt = new Date(Date.now() + 10_000);

      // predictWeather に渡すための現在の値を取得
      const currentCode = weather.hourly.weather_code[0];
      const temp = weather.hourly.temperature_2m[0];
      const prec = weather.hourly.precipitation[0];
      const humidity = weather.hourly.relative_humidity_2m[0];
      const wind = weather.hourly.wind_speed_10m[0];

      // その他、関数が必要とする引数を準備
      // weatherData や threshold はアプリの現在の設定値に合わせて渡してください
      const weatherDescription = predictWeather(
        currentCode,
        temp,
        prec,
        humidity,
        wind,
        [[0]], // 仮の2次元配列（ridgeDetection用）
        10     // 仮の閾値
      );

      // 通知に「文字」を渡す
      await scheduleWeatherNotification(
        weatherDescription, // ここが文字列（例: "晴れ", "小雨"）になります
        notifyAt
      );

      Alert.alert('Success', 'Test notification scheduled!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error');
    }
  };

  return (
    <View style={styles.container}>
      <SettingRow label={t('settings.24h', '24-hour Format')}>
        <Switch value={is24Hour} onValueChange={() => setIs24Hour(v => !v)} />
      </SettingRow>

      <SettingRow label={t('settings.notifications', 'Notifications')}>
        <Switch value={isNotificationsEnabled} onValueChange={toggleNotificationsSwitch} />
      </SettingRow>

      <SettingRow label={t('settings.use_location', 'Use Location')}>
        <Switch value={useCurrentLocation} onValueChange={toggleUseCurrentLocation} />
      </SettingRow>

      <View style={styles.languageSection}>
        <Text style={styles.label}>{t('language.label', 'Language')}</Text>
        <Picker selectedValue={language} onValueChange={v => changeLanguage(v as Language)}>
          <Picker.Item label="日本語" value="ja" />
          <Picker.Item label="English" value="en" />
          <Picker.Item label="Español" value="es" />
          <Picker.Item label="Français" value="fr" />
          <Picker.Item label="Deutsch" value="de" />
          <Picker.Item label="中文" value="zh" />
          <Picker.Item label="한국어" value="ko" />
        </Picker>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Test Notification" onPress={handleManualNotification} />
        <View style={{ height: 12 }} />
        <Button title="Save Settings" onPress={saveSettings} />
      </View>
    </View>
  );
}

const SettingRow = ({ label, children }: any) => (
  <View style={styles.settingItem}>
    <Text style={styles.text}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFF',
    marginBottom: 12,
    borderRadius: 12,
  },
  text: { fontSize: 16, fontWeight: '600' },
  languageSection: { marginVertical: 16 },
  label: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  buttonContainer: { marginTop: 20 },
});

export default SettingsScreen;
