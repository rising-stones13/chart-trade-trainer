import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getSecrets } from './secrets';

// 初期化処理をPromiseとして保持するための変数
let adminAppPromise: Promise<App> | null = null;

const getAppInstance = async (): Promise<App> => {
  // 既に初期化が始まっていれば、既存のインスタンスを返す
  if (getApps().length > 0) {
    return getApp();
  }

  // Secret Managerから機密情報を取得
  const secrets = await getSecrets();
  
  const firebaseProjectId = secrets.FIREBASE_PROJECT_ID;
  const firebaseClientEmail = secrets.FIREBASE_CLIENT_EMAIL;
  const firebasePrivateKey = secrets.FIREBASE_PRIVATE_KEY;

  if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
      throw new Error('Firebase Admin SDKの認証情報がSecret Managerにありません。');
  }
  
  // アプリケーションを初期化
  return initializeApp({
    credential: cert({
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      privateKey: firebasePrivateKey.replace(/\\n/g, '\n'), 
    }),
  });
};

/**
 * FirestoreとAuthのインスタンスを返す関数。
 * 競合状態を防ぎ、常に単一のインスタンスを返す。
 */
export const getFirebaseAdmin = async (): Promise<{ db: Firestore; auth: Auth }> => {
  if (!adminAppPromise) {
    adminAppPromise = getAppInstance();
  }
  
  const app = await adminAppPromise;
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  return { db, auth };
};
