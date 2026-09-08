import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

const firebaseConfig = { 
  apiKey : "AIzaSyDff_q26-sE8hqaIlmmHFuDF0Yi-B-1REo" , 
  authDomain : "dollar-f69a2.firebaseapp.com" , 
  معرّف المشروع : "dollar-f69a2" ، 
  storageBucket : "dollar-f69a2.firebasestorage.app" , 
  messagingSenderId : "553294197296" , 
  معرف التطبيق : "1:553294197296:web:8eafa7dea8f04f7449b3f5 " 
  معرف القياس : "G-L470W8WLFE" 
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
