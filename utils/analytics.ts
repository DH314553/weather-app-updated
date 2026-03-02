import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAnalytics,
  logEvent as firebaseLogEvent,
  isSupported,
  setUserProperties as firebaseSetUserProperties,
} from "firebase/analytics";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyDjmAt7CB7A2ty4CexusMmXn0j6z2v6WDg",
  authDomain: "weather-app-82ee8.firebaseapp.com",
  projectId: "weather-app-82ee8",
  storageBucket: "weather-app-82ee8.firebasestorage.app",
  messagingSenderId: "306036335322",
  appId: "1:306036335322:web:7df27feec90c0185047be3",
  measurementId: "G-G1V7J5YQLQ"
};

// 🔹 Firebase初期化（重複防止）
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let analytics: any = null;

// 🔹 WebのみAnalytics有効化
if (Platform.OS === "web") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// ===============================
// Analytics Functions
// ===============================

export const logScreenView = async (screenName: string) => {
  if (!analytics) return;

  firebaseLogEvent(analytics, "screen_view", {
    firebase_screen: screenName,
    firebase_screen_class: screenName,
  });
};

export const logEvent = async (
  name: string,
  params?: Record<string, any>
) => {
  if (!analytics) return;

  firebaseLogEvent(analytics, name, params);
};

export const setUserProperties = async (
  properties: Record<string, string | null>
) => {
  if (!analytics) return;

  firebaseSetUserProperties(analytics, properties);
};

export { analytics };