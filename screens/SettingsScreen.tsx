import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Button, Alert } from 'react-native';
import { registerForPushNotificationsAsync, scheduleWeatherNotification } from '../utils/notifications';
import * as Notifications from 'expo-notifications';
import { fetchWeatherData, fetchCoordinates } from '../utils/weather';
import { usePrefecture } from '../PrefectureContext';
import { registerBackgroundFetchAsync, unregisterBackgroundFetchAsync } from '../utils/backgroundTasks';
import AsyncStorage from '@react-native-async-storage/async-storage';

function SettingsScreen() {
  const [is24Hour, setIs24Hour] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const prefectureContext = usePrefecture();
  const selectedPrefecture = prefectureContext?.selectedPrefecture;

  useEffect(() => {
    registerForPushNotificationsAsync();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedIs24Hour = await AsyncStorage.getItem('is24Hour');
      const savedIsNotificationsEnabled = await AsyncStorage.getItem('isNotificationsEnabled');
      if (savedIs24Hour !== null) setIs24Hour(JSON.parse(savedIs24Hour));
      if (savedIsNotificationsEnabled !== null) setIsNotificationsEnabled(JSON.parse(savedIsNotificationsEnabled));
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('is24Hour', JSON.stringify(is24Hour));
      await AsyncStorage.setItem('isNotificationsEnabled', JSON.stringify(isNotificationsEnabled));
      Alert.alert("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      Alert.alert("Failed to save settings.");
    }
  };

  const toggle24HourSwitch = () => setIs24Hour(previousState => !previousState);

  const toggleNotificationsSwitch = async () => {
    setIsNotificationsEnabled(previousState => !previousState);
    if (!isNotificationsEnabled) {
      try {
        await registerBackgroundFetchAsync();
      } catch (error) {
        console.error("Failed to register background fetch:", error);
      }
    } else {
      try {
        await unregisterBackgroundFetchAsync();
      } catch (error) {
        console.error("Failed to unregister background fetch:", error);
      }
      // Cancel all scheduled notifications
      Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const handleManualNotification = async () => {
    try {
      // Fetch weather data
      if (selectedPrefecture) {
        const coordinates = await fetchCoordinates(selectedPrefecture.name);
        const weatherData = await fetchWeatherData(coordinates.lat, coordinates.lon);
        // Schedule a notification for the next hour
        const weather = weatherData.hourly.weather_code[0].toString();
        const notificationTime = new Date(weatherData.hourly.time[0]);
        scheduleWeatherNotification(weather, notificationTime);
      } else {
        console.error("Selected prefecture is undefined.");
      }
    } catch (error) {
      console.error("Failed to fetch weather data or schedule notification:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.settingItem}>
        <Text style={styles.text}>24時間表記</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={is24Hour ? "#f5dd4b" : "#f4f3f4"}
          onValueChange={toggle24HourSwitch}
          value={is24Hour}
        />
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.text}>通知</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isNotificationsEnabled ? "#f5dd4b" : "#f4f3f4"}
          onValueChange={toggleNotificationsSwitch}
          value={isNotificationsEnabled}
        />
      </View>
      <Button title="手動で通知を送信" onPress={handleManualNotification} />
      <Button title="設定を保存" onPress={saveSettings} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
});

export default SettingsScreen;