import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithRedirect, 
    signOut, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';

// إعدادات مشروعك (chatzeuss)
const firebaseConfig = {
  apiKey: "AIzaSyCJrJpoRI4tpKI6D1HRZ3Cdr-BeB3kaQx0",
  authDomain: "chatzeuss.firebaseapp.com",
  projectId: "chatzeuss",
  storageBucket: "chatzeuss.firebasestorage.app",
  messagingSenderId: "245494133164",
  appId: "1:245494133164:web:60a21c27d362b81c4cca09",
  measurementId: "G-MHZNDVDBQN"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// دالة تسجيل الدخول بجوجل (تم التعديل لاستخدام Redirect لحل مشاكل التطبيقات الأصلية)
export const signInWithGoogle = async () => {
    try {
        await signInWithRedirect(auth, googleProvider);
    } catch (error) {
        console.error("Error signing in", error);
        alert("فشل بدء عملية تسجيل الدخول.");
    }
};

// دالة تسجيل الخروج
export const logout = async () => {
    await signOut(auth);
};

// تصدير الأدوات
export { 
    onAuthStateChanged, 
    collection, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp 
};