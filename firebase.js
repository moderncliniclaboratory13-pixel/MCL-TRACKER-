import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAebOyjlTg_nmqVYpRlE4AgnTroDap9kn8",
  authDomain: "mcl-entry.firebaseapp.com",
  projectId: "mcl-entry",
  storageBucket: "mcl-entry.firebasestorage.app",
  messagingSenderId: "712111742749",
  appId: "1:712111742749:web:2c073ced38eaba1320cbf4",
  measurementId: "G-9T36600K37"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

