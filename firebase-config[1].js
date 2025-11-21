// Firebase config for project 'elmasry-2c285' (from your Firebase console)
const firebaseConfig = {
  apiKey: "AIzaSyByak7F5iWVvUBHGrv2XcqRpkMZafL3DQ",
  authDomain: "elmasry-2c285.firebaseapp.com",
  projectId: "elmasry-2c285",
  storageBucket: "elmasry-2c285.appspot.com",
  messagingSenderId: "862403272904",
  appId: "1:862403272904:web:15d66f26ebc5e1bee5c5fd",
  measurementId: "G-4LCDQNYHNQ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
