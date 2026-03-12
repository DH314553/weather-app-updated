import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyDjmAt7CB7A2ty4CexusMmXn0j6z2v6WDg',
  authDomain: 'weather-app-82ee8.firebaseapp.com',
  projectId: 'weather-app-82ee8',
  storageBucket: 'weather-app-82ee8.firebasestorage.app',
  messagingSenderId: '306036335322',
  appId: '1:306036335322:web:7df27feec90c0185047be3',
  measurementId: 'G-G1V7J5YQLQ',
};

export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance;
if (Platform.OS === 'web') {
  authInstance = getAuth(firebaseApp);
} else {
  try {
    authInstance = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (err: any) {
    // If already initialized, fall back to the existing instance.
    authInstance = getAuth(firebaseApp);
  }
}

export const auth = authInstance;
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const functionsClient = getFunctions(firebaseApp, 'us-central1');
