import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCVmsfJWUbhp70j0v0fytZ8uVDV57DlxTo",
  authDomain: "dump-6ea54.firebaseapp.com",
  projectId: "dump-6ea54",
  storageBucket: "dump-6ea54.firebasestorage.app",
  messagingSenderId: "410563850148",
  appId: "1:410563850148:web:2a9760b226d703f1fd5b31"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);