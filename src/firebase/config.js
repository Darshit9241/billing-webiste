import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA5wD1j3KKjDk1AP221cmThgWRkNhOjTO8",
    authDomain: "compant-tex.firebaseapp.com",
    databaseURL: "https://compant-tex-default-rtdb.firebaseio.com",
    projectId: "compant-tex",
    storageBucket: "compant-tex.firebasestorage.app",
    messagingSenderId: "639954171473",
    appId: "1:639954171473:web:9f5abbdfd28ceae9306a70",
    measurementId: "G-GQ68S01VBP"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { app, database, auth };