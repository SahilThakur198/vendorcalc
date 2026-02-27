import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 Firebase Configuration — VendorCalc
// All values are loaded from environment variables (.env file).
// Never commit API keys to source control.
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const isFirebaseConfigured = !!firebaseConfig.apiKey;

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

if (isFirebaseConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        firestoreDb = getFirestore(app);
        firebaseAuth = getAuth(app);
    } catch (err) {
        console.warn('Firebase init failed:', err);
    }
}

export { app, firestoreDb as firestore, firebaseAuth as auth };
