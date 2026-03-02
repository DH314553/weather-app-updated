import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent as firebaseLogEvent } from "firebase/analytics";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyAF88gfLUIC9SUxT5iDCl61OtSVpRFX9s0",
  authDomain: "weather-app-82ee8.firebaseapp.com",
  projectId: "weather-app-82ee8",
  storageBucket: "weather-app-82ee8.firebasestorage.app",
  messagingSenderId: "306036335322",
  appId: "1:306036335322:android:ac26d0d89b6d05a7047be3",
};

const app = initializeApp(firebaseConfig);

let analytics: any = null;

if (Platform.OS === "web") {
  analytics = getAnalytics(app);
}

export const logScreenView = async (screenName: string) => {
  if (!analytics) return;

  await firebaseLogEvent(analytics, "screen", {
    screen_name: screenName,
    screen_class: screenName,
  });
};

export const logEvent = async (
  name: string,
  params?: Record<string, any>
) => {
  if (!analytics) return;

  await firebaseLogEvent(analytics, name, params);
};

export const setUserProperties = async (
  properties: Record<string, string | null>
) => {
  if (!analytics) return;

  Object.entries(properties).forEach(([key, value]) => {
    firebaseLogEvent(analytics, "set_user_property", {
      [key]: value,
    });
  });
};


export { analytics };