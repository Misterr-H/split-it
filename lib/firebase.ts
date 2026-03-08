import { getApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBlehEG6-drNvgjmdBtlrxFtiA6LgmzQSs',
  authDomain: 'split-it-80a37.firebaseapp.com',
  projectId: 'split-it-80a37',
  storageBucket: 'split-it-80a37.firebasestorage.app',
  messagingSenderId: '664811535679',
  appId: '1:664811535679:web:640c6012df0a969a14278a',
  measurementId: 'G-F7G70EZ5DC',
};

console.log('[Firebase] module evaluating, existing apps:', getApps().length);

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

console.log('[Firebase] app ready, isFirstInit:', isFirstInit);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth');
console.log('[Firebase] getReactNativePersistence available:', typeof getReactNativePersistence);

// Guard initializeAuth — calling it twice on the same app throws.
let auth: Auth;
try {
  if (isFirstInit) {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence
        ? getReactNativePersistence(AsyncStorage)
        : undefined,
    });
    console.log('[Firebase] auth initialized with persistence');
  } else {
    auth = getAuth(app);
    console.log('[Firebase] auth retrieved (already initialized)');
  }
} catch (e) {
  console.error('[Firebase] auth init error:', e);
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
