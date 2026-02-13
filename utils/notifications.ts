import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_NOTIFICATION_ID_KEY = 'weather_notification_id';

/**
 * 🔥 通知ハンドラ設定
 * アプリがフォアグラウンドにある時の挙動を設定します
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/* =========================================
   🔔 通知権限 + PushToken取得
========================================= */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Physical device required for Push Notifications');
      // シミュレーターでも動作確認したい場合はここをコメントアウトするか、nullを返さずに進める処理が必要です
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('weather', {
        name: 'Weather Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Expo Go または EAS Build の設定に応じて Project ID が必要な場合がありますが、
    // 基本的な実装としてはこれでOKです。
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('Expo Push Token:', token);

    return token;
  } catch (error) {
    console.error('register error:', error);
    return null;
  }
}

/* =========================================
   🧹 既存通知キャンセル（重複防止）
========================================= */
export async function cancelWeatherNotification() {
  try {
    const id = await AsyncStorage.getItem(WEATHER_NOTIFICATION_ID_KEY);

    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(WEATHER_NOTIFICATION_ID_KEY);
      console.log('Old notification cancelled:', id);
    }
  } catch (error) {
    console.error('cancel error:', error);
  }
}

/* =========================================
   🌅 通知スケジューリング
   指定された天気を、指定された時間（または5秒後）に通知します
========================================= */
export async function scheduleWeatherNotification(
  weather: string,
  notificationTime: Date
) {
  try {
    // 既存のスケジュールがあれば削除
    await cancelWeatherNotification();

    const now = new Date();

    // 指定時間が現在より過去の場合、現在時刻の5秒後に設定（テスト用ロジックとして維持）
    // そうでなければ指定された時間を使用
    const fireDate =
      notificationTime.getTime() <= now.getTime()
        ? new Date(now.getTime() + 5000)
        : notificationTime;

    // ▼▼▼ 修正箇所 ▼▼▼
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '天気予報のお知らせ',
        body: `現在の天気: ${weather}`,
        data: { weather },
        sound: 'default', // iOS用（Androidはチャンネル設定が優先されます）
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE, // 'date' でも可
        date: fireDate, // Expo SDKのバージョンによっては単に fireDate でも動きますが、オブジェクト形式が確実です
      },
    });
    // ▲▲▲ 修正箇所 ▲▲▲

    console.log(`Notification scheduled for: ${fireDate.toLocaleString()}`);

    await AsyncStorage.setItem(WEATHER_NOTIFICATION_ID_KEY, id);
  } catch (error) {
    console.error('schedule error:', error);
  }
}