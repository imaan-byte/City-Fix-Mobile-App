import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "city-fix1.firebaseapp.com",
  projectId: "city-fix1",
  storageBucket: "city-fix1.firebasestorage.app",
  messagingSenderId: "792895085794",
  appId: "1:792895085794:web:41687d051392296a2812bb",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth =
  getApps().length && initializeAuth?.length
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      })
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

export const db = getFirestore(app);

// Force exact Firebase Storage bucket
export const storage = getStorage(
  app,
  `gs://${firebaseConfig.storageBucket}`
);

console.log(
  "Firebase storageBucket (app options):",
  app.options?.storageBucket
);
