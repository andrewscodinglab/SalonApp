import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAmth-riDLw_EbVMWqQ_sV4Tzzs7Lcsmu0",
  authDomain: "salonproapp.firebaseapp.com",
  projectId: "salonproapp",
  storageBucket: "salonproapp.firebasestorage.app",
  messagingSenderId: "65396158771",
  appId: "1:65396158771:web:c4c5bb94895a7f9642ce46",
  measurementId: "G-5KSME01WFJ"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Analytics and Firestore
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
const db = getFirestore(app);

export { db, analytics }; 