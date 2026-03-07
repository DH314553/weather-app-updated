import {
  getAnalytics,
  logEvent as firebaseLogEvent,
  isSupported,
  setUserProperties as firebaseSetUserProperties,
} from "firebase/analytics";
import { Platform } from "react-native";
import { firebaseApp } from "./firebase";

let analytics: any = null;

// 🔹 WebのみAnalytics有効化
if (Platform.OS === "web") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(firebaseApp);
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
