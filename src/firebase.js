import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBlMSGd7u8f-XU1s4JtgISbIBgPN7IcPoM",
  authDomain: "absen-80104.firebaseapp.com",
  projectId: "absen-80104",
  storageBucket: "absen-80104.firebasestorage.app",
  messagingSenderId: "509374989889",
  appId: "1:509374989889:web:11e5f546ebed1d43b0e8c0",
  measurementId: "G-E7HL07KJ3L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
