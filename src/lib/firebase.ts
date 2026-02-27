import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 Firebase Configuration — VendorCalc
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyDMTRRmKooEQoDYhIFOpLNje9VcTJgl9rc",
    authDomain: "vendorcalc-54e45.firebaseapp.com",
    projectId: "vendorcalc-54e45",
    storageBucket: "vendorcalc-54e45.firebasestorage.app",
    messagingSenderId: "369726135971",
    appId: "1:369726135971:web:050124dbb2be76d0dde916",
    measurementId: "G-EG5LWLS9PV",
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
