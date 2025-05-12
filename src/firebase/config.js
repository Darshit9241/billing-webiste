import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//     apiKey: "AIzaSyA5wD1j3KKjDk1AP221cmThgWRkNhOjTO8",
//     authDomain: "compant-tex.firebaseapp.com",
//     databaseURL: "https://compant-tex-default-rtdb.firebaseio.com",
//     projectId: "compant-tex",
//     storageBucket: "compant-tex.firebasestorage.app",
//     messagingSenderId: "639954171473",
//     appId: "1:639954171473:web:9f5abbdfd28ceae9306a70",
//     measurementId: "G-GQ68S01VBP"
//   };


const firebaseConfig = {
  apiKey: "AIzaSyA8TZGvADiOJhxpNlG4nMu4a9YL0DGqfRY",
  authDomain: "siyaram-6c7da.firebaseapp.com",
  databaseURL: "https://siyaram-6c7da-default-rtdb.firebaseio.com",
  projectId: "siyaram-6c7da",
  storageBucket: "siyaram-6c7da.firebasestorage.app",
  messagingSenderId: "99363792943",
  appId: "1:99363792943:web:890b4725e3f9db7feb3eda",
  measurementId: "G-Y41N32RMVG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { app, database, auth };