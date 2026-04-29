import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with experimentalForceLongPolling to bypass potential WebSocket issues in the preview proxy
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one.
        console.warn('Multiple tabs, persistence not enabled.');
    } else if (err.code == 'unimplemented') {
        // The current browser doesn't support all of the features needed to enable persistence
        console.warn('Browser does not support persistence.');
    }
});

export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
