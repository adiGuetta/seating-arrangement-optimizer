import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyCj34hxZZieL3pSUhLLR0PsPQ_QpPTfGUw",
  authDomain: "wedding-seating-75c25.firebaseapp.com",
  projectId: "wedding-seating-75c25",
  storageBucket: "wedding-seating-75c25.firebasestorage.app",
  messagingSenderId: "616555091525",
  appId: "1:616555091525:web:4c8d30e35c08f46d3cb52c",
};

const app = initializeApp(firebaseConfig);

let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);
