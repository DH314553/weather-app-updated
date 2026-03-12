// utils/backgroundTasks.ts

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from './i18n';
import { Platform } from 'react-native';
import { fetchWeatherData, fetchCoordinates, predictWeather } from './weather';
import { cudaRidgeDetection } from './ridgeDetection';
// No user-controlled rain settings: use default threshold
const DEFAULT_RAIN_THRESHOLD = 30;

const BACKGROUND_WEATHER_TASK = 'BACKGROUND_WEATHER_TASK';

/* =========================================================
   ▼ バックグラウンドタスク定義
========================================================= */
async function performWeatherCheck(): Promise<BackgroundFetch.BackgroundFetchResult> {
  try {
    console.log("🌙 Background weather task started");

    // Try to determine user's selected municipality file. First prefer AsyncStorage 'selectedPrefecture',
    // then fall back to scanning documentDirectory for municipalities_*.json files.
    let prefName = await AsyncStorage.getItem('selectedPrefecture');
    let fileUri: string | null = null;

    if (prefName) {
      const v7Uri = `${FileSystem.documentDirectory}municipalities_${prefName}_v7.json`;
      const v7Info = await FileSystem.getInfoAsync(v7Uri);
      if (v7Info.exists) {
        fileUri = v7Uri;
      } else {
        const v5Uri = `${FileSystem.documentDirectory}municipalities_${prefName}_v5.json`;
        const v5Info = await FileSystem.getInfoAsync(v5Uri);
        if (v5Info.exists) fileUri = v5Uri;
      }
    }

    if (!fileUri) {
      // scan for any municipalities_*.json as a fallback
      try {
        const dir = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory || '');
        const v7Match = dir.find(f => f.startsWith('municipalities_') && f.endsWith('_v7.json'));
        const v5Match = dir.find(f => f.startsWith('municipalities_') && f.endsWith('_v5.json'));
        const match = v7Match || v5Match;
        if (match) {
          fileUri = `${FileSystem.documentDirectory}${match}`;
          if (!prefName) {
            prefName = match
              .replace(/^municipalities_/, '')
              .replace(/_v\d+\.json$/, '');
          }
        }
      } catch (e) {
        console.log('❌ Error reading document directory', e);
      }
    }

    if (!fileUri) {
      console.log("❌ 市町村データなし");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      console.log("❌ 市町村データなし (file missing)");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const json = await FileSystem.readAsStringAsync(fileUri);

    let selected;
    try {
      selected = JSON.parse(json).municipalities ? JSON.parse(json).municipalities[0] : JSON.parse(json);
    } catch (err) {
      console.log("❌ JSONパース失敗", err);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    if (!selected?.name) {
      console.log("❌ 不正なデータ");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 座標取得（フォールバックなし、キャッシュのみ）
    const coordinates = await fetchCoordinates(
      selected.kana || selected.name,
      false,
      prefName || undefined
    );

    if (!coordinates) {
      console.log("❌ 座標取得失敗");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 天気取得
    const weather = await fetchWeatherData(
      coordinates.lat,
      coordinates.lon
    );

    if (!weather?.hourly?.time?.length) {
      console.log("❌ 天気データなし");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const temperature = weather.hourly.temperature_2m[0];
    const rain = weather.hourly.precipitation_probability[0];
    const wind = weather.hourly.wind_speed_10m[0];
    const code = weather.hourly.weather_code[0];

    const predicted = predictWeather(code, temperature, rain, wind);

      // Optional: run ridge detection on the next 24h precipitation grid (6x4) to detect patterns
      try {
        const rows = 6; const cols = 4; const grid: number[][] = [];
        for (let r = 0; r < rows; r++) {
          const row: number[] = [];
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const val = (weather.hourly.precipitation_probability?.[idx] ?? 0) / 100.0;
            row.push(val);
          }
          grid.push(row);
        }
        const ridgeRes = cudaRidgeDetection(grid, 0.3);
        console.log('🔍 Ridge detection result:', ridgeRes);
      } catch (e) {
        console.log('Ridge detection failed', e);
      }

    // 自動通知: ユーザー設定は廃止。降水確率が閾値以上、または予測が雨系なら通知。
    const isRainPredicted = ['雨', '大雨', '雷雨', '大雪', '雪'].includes(predicted);
    const meetsThreshold = (rain ?? 0) >= DEFAULT_RAIN_THRESHOLD;
    if (!isRainPredicted && !meetsThreshold) {
      console.log(`☔️ No significant rain (${rain}%), skipping notification`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 通知送信（ローカライズ対応）
    const title = t('notification.title', undefined, `${selected.name} の最新天気`);
    const body = t('notification.body', { predicted, temp: Math.round(temperature), rain: Math.round(rain ?? 0) }, `${predicted} / ${Math.round(temperature)}°` + (rain ? `  降水確率 ${Math.round(rain)}%` : ''));

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });

    console.log("✅ 通知送信完了");

    return BackgroundFetch.BackgroundFetchResult.NewData;

  } catch (error) {
    console.log("❌ Background task error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

TaskManager.defineTask(BACKGROUND_WEATHER_TASK, async () => {
  return performWeatherCheck();
});

export async function runBackgroundWeatherCheckOnce() {
  return performWeatherCheck();
}

/* =========================================================
   ▼ タスク登録
========================================================= */
export async function registerBackgroundFetchAsync() {
  const status = await BackgroundFetch.getStatusAsync();

  if (
    status !== BackgroundFetch.BackgroundFetchStatus.Available
  ) {
    console.log("❌ BackgroundFetch 利用不可");
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_WEATHER_TASK
  );

  if (isRegistered) {
    console.log("⚠ すでに登録済み");
    return;
  }

  await BackgroundFetch.registerTaskAsync(BACKGROUND_WEATHER_TASK, {
    minimumInterval: 60 * 60, // 1時間
    stopOnTerminate: false,
    startOnBoot: true,
  });

  console.log("✅ BackgroundFetch 登録完了");
}

/* =========================================================
   ▼ タスク解除
========================================================= */
export async function unregisterBackgroundFetchAsync() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_WEATHER_TASK
  );

  if (!isRegistered) {
    console.log("⚠ 未登録");
    return;
  }

  await BackgroundFetch.unregisterTaskAsync(
    BACKGROUND_WEATHER_TASK
  );

  console.log("🗑 BackgroundFetch 解除完了");
}

/* =========================================================
   ▼ 通知初期設定（Android対応）
========================================================= */
export async function setupNotificationsAsync() {
  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== 'granted') {
    console.log("❌ 通知許可なし");
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      'weather-channel',
      {
        name: 'Weather Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      }
    );
  }

  console.log("✅ 通知設定完了");
}
