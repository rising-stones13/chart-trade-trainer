import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { cert } from 'firebase-admin/app'; // certを明示的にインポート

let app: App;

if (!getApps().length) {
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;  
  const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.includes('\\n') ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : process.env.FIREBASE_PRIVATE_KEY
    : undefined;

  if (!firebaseProjectId) {
    throw new Error('FIREBASE_PROJECT_ID is not defined in environment variables.');
  }
  if (!firebaseClientEmail) {
    throw new Error('FIREBASE_CLIENT_EMAIL is not defined in environment variables.');
  }
  if (!firebasePrivateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY is not defined in environment variables.');
  }

  // Firebase Admin SDK の初期化
  app = initializeApp({
    credential: cert({ // certを直接使用
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      privateKey: firebasePrivateKey,
    }),
  });
} else {
  app = getApp(); // 既に初期化されている場合は既存のアプリを取得
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export { db, auth };