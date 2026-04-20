import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCDYvl_pY8Fxg2C6SUnoECL4Vh8967wE1w',
  authDomain: 'besayfe-restaurant.firebaseapp.com',
  projectId: 'besayfe-restaurant',
  storageBucket: 'besayfe-restaurant.firebasestorage.app',
  messagingSenderId: '348312126093',
  appId: '1:348312126093:web:669cc8d4182cd7954758c4',
  measurementId: 'G-CLJG0VF8B8',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
