import React, { useState, useEffect } from 'react';
import {
  View, Text, Switch, StyleSheet, ScrollView, Alert, Linking, Platform, TouchableOpacity
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

// 内部ユーティリティ
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { usePrefecture } from '../PrefectureContext';
import { registerBackgroundFetchAsync, unregisterBackgroundFetchAsync, runBackgroundWeatherCheckOnce } from '../utils/backgroundTasks';
import { t } from '../utils/i18n';
import { useLanguage } from '../LanguageContext';

type Language = 'ja' | 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ko';

export default function SettingsScreen() {
  const [is24Hour, setIs24Hour] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const { language, changeLanguage } = useLanguage();
  const prefectureContext = usePrefecture();
  const selectedPrefecture = prefectureContext?.selectedPrefecture;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const keys = ['is24Hour', 'isNotificationsEnabled', 'useCurrentLocation', 'language'];
      const stores = await AsyncStorage.multiGet(keys);
      stores.forEach(([key, value]) => {
        if (!value) return;
        const parsed = key === 'language' ? value : JSON.parse(value);
        switch (key) {
          case 'is24Hour': setIs24Hour(parsed); break;
          case 'isNotificationsEnabled': setIsNotificationsEnabled(parsed); break;
          case 'useCurrentLocation': setUseCurrentLocation(parsed); break;
          case 'language': changeLanguage(parsed as Language); break;
          default: break;
        }
      });
    } catch (e) { console.error('Load settings error:', e); }
  };

  const persistSetting = async (key: string, value: any) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error(e); }
  };

  const toggleNotifications = async () => {
    const nextState = !isNotificationsEnabled;
    
    // オフにする場合は即実行
    if (!nextState) {
      setLoading(true);
      try {
        await unregisterBackgroundFetchAsync();
        await Notifications.cancelAllScheduledNotificationsAsync();
        setIsNotificationsEnabled(false);
        await persistSetting('isNotificationsEnabled', false);
      } finally {
        setLoading(false);
      }
      return;
    }

    // オンにする場合の権限チェック
    setLoading(true);
    try {
      // 1. 現在の権限状態を確認
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // 2. 権限が未選択(undetermined)ならリクエスト
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // 3. 最終的に拒否されている場合
      if (finalStatus !== 'granted') {
        Alert.alert(
          t('common.error', undefined, 'Error'),
          t('weather.locationPermissionError', undefined, 'Notification permission is required to receive weather alerts.'),
          [
            { text: t('common.cancel', undefined, 'Cancel'), style: 'cancel' },
            { 
              text: t('settings.title', undefined, 'Settings'), 
              onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() 
            }
          ]
        );
        setLoading(false);
        return;
      }

      // 4. 許可がある場合はバックグラウンドタスクを登録し、即時チェックを試行
      try {
        await registerBackgroundFetchAsync();
        // 即時の天気チェックを実行して、接続許可があれば通知を出す
        await runBackgroundWeatherCheckOnce();
      } catch (err) {
        console.log('Background registration/check error', err);
      }

      setIsNotificationsEnabled(true);
      await persistSetting('isNotificationsEnabled', true);
    } catch (e) {
      console.error('Notification Toggle Error:', e);
      Alert.alert(t('common.error', undefined, 'Error'), t('settings.notificationUpdateFailed', undefined, 'Failed to update notification settings.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>{t('common.select', undefined, 'Settings')}</Text>

      {/* 基本設定セクション */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('common.search', undefined, 'General')}</Text>
        
        <SettingItem
          icon="clock-outline"
          label={t('settings.24h', undefined, '24-hour Format')}
          value={is24Hour}
          onToggle={(v: boolean) => { setIs24Hour(v); persistSetting('is24Hour', v); }}
        />

        <SettingItem
          icon="bell-outline"
          label={t('settings.notifications', undefined, 'Notifications')}
          value={isNotificationsEnabled}
          onToggle={toggleNotifications}
          disabled={loading}
        />

        {/* Notifications handled automatically when enabled */}

        <SettingItem
          icon="map-marker-outline"
          label={t('settings.use_location', undefined, 'Use Location')}
          value={useCurrentLocation}
          onToggle={async () => {
            if (!useCurrentLocation) {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') return;
            }
            const next = !useCurrentLocation;
            setUseCurrentLocation(next);
            persistSetting('useCurrentLocation', next);
          }}
        />
      </View>

      {/* 言語設定セクション */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('language.label', undefined, 'Language')}</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={language}
            onValueChange={(v) => { changeLanguage(v as Language); persistSetting('language', v); }}
          >
            <Picker.Item label={t('language.japanese', undefined, '日本語')} value="ja" />
            <Picker.Item label={t('language.english', undefined, 'English')} value="en" />
            <Picker.Item label={t('language.spanish', undefined, 'Spanish')} value="es" />
            <Picker.Item label={t('language.french', undefined, 'French')} value="fr" />
            <Picker.Item label={t('language.german', undefined, 'German')} value="de" />
            <Picker.Item label={t('language.chinese', undefined, 'Chinese')} value="zh" />
            <Picker.Item label={t('language.korean', undefined, 'Korean')} value="ko" />
          </Picker>
        </View>
      </View>

      {/* 情報セクション */}
      <View style={styles.infoSection}>
        <MaterialCommunityIcons name="information-outline" size={16} color="#999" />
        <Text style={styles.footerText}>
          {t('prefecture.label', undefined, 'Prefecture:')} {selectedPrefecture?.name ?? '---'}
        </Text>
      </View>
    </ScrollView>
  );
}

const SettingItem = ({ icon, label, value, onToggle, disabled }: any) => (
  <View style={styles.settingRow}>
    <View style={styles.labelContainer}>
      <MaterialCommunityIcons name={icon} size={22} color="#444" />
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    <Switch 
      value={value} 
      onValueChange={onToggle} 
      disabled={disabled}
      trackColor={{ false: "#D1D1D1", true: "#81b0ff" }}
      thumbColor={value ? "#1976D2" : "#f4f3f4"}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', marginBottom: 24 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
  settingRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8
  },
  labelContainer: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { fontSize: 16, fontWeight: '600', marginLeft: 12, color: '#333' },
  pickerContainer: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden' },
  infoSection: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerText: { color: '#999', fontSize: 13 },

  // threshold UI
  thresholdSection: { marginTop: 10, padding: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
  thresholdLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 6 },
  thresholdHint: { fontSize: 12, color: '#777', marginBottom: 10 },
  chipsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  chipSelected: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  chipUnselected: { backgroundColor: '#FFF', borderColor: '#EEE' },
  chipDisabled: { opacity: 0.5 },
  chipText: { fontWeight: '700', color: '#333' },
  chipTextSelected: { color: '#FFF' },
  testButton: { marginTop: 12, backgroundColor: '#1976D2', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  testButtonText: { color: '#FFF', fontWeight: '700' }
});