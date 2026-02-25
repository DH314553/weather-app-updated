import * as Notifications from "expo-notifications";

export async function enableNotification() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "天気通知",
      body: "今日の天気を確認してください"
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 7,
      minute: 0,
    }
  });
}
