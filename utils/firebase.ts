import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

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

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const functionsClient = getFunctions(firebaseApp, 'us-central1');
