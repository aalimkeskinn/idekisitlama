// Firebase configuration - SECURE VERSION
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// SECURITY: Environment variables kullanımı
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// SECURITY: Configuration validation
const validateConfig = () => {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missingKeys = requiredKeys.filter(key => !import.meta.env[key]);
  
  if (missingKeys.length > 0) {
    console.error('🔒 SECURITY ERROR: Missing Firebase environment variables:', missingKeys);
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  // SECURITY: Validate API key format
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey || !apiKey.startsWith('AIza') || apiKey.length < 30) {
    console.error('🔒 SECURITY ERROR: Invalid Firebase API key format');
    throw new Error('Invalid Firebase API key format');
  }

  console.log('✅ Firebase configuration validated successfully');
};

// Validate configuration before initializing
validateConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// SECURITY: Export only necessary instances
export default app;

// SECURITY: Log configuration status (without sensitive data)
console.log('🔥 Firebase initialized for project:', import.meta.env.VITE_FIREBASE_PROJECT_ID);