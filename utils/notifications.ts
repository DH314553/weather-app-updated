import * as Notifications from 'expo-notifications';

export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log(token);
}

export async function scheduleWeatherNotification(weather: string, notificationTime: Date) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Weather Update',
      body: `The weather is ${weather}`,
      data: { weather },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notificationTime,
    },
  });
}