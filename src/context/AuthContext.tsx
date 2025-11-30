'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser, // Add deleteUser
  reauthenticateWithCredential // Add reauthenticateWithCredential
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Adjust the import path as necessary
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'; // Add deleteDoc

interface UserData {
    email: string | null;
    isPremium: boolean;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  logIn: (email: string, password: string) => Promise<UserCredential>;
  logOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  deleteAccount: () => Promise<void>; // Add deleteAccount
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      isPremium: false,
    });
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      setUserData(userDoc.data() as UserData);
    }
    return userCredential;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          isPremium: false,
        });
        const newUserDoc = await getDoc(userDocRef);
        if (newUserDoc.exists()){
             setUserData(newUserDoc.data() as UserData);
        }
      } else {
        setUserData(userDoc.data() as UserData);
      }
    } catch (error) {
      console.error("Error during Google sign-in", error);
    }
  };

  const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Firestoreのユーザーデータも削除
        const userDocRef = doc(db, 'users', currentUser.uid);
        await deleteDoc(userDocRef);

        await deleteUser(currentUser);
        console.log("User account and data deleted successfully.");
        // 削除後、自動的にログアウトされるため、UIは自動的に更新されるはずです。
      } catch (error: any) {
        console.error("Error deleting user account:", error);
        if (error.code === 'auth/requires-recent-login') {
          // 再認証が必要な場合は、UI側で処理できるようにエラーを再スロー
          throw new Error("auth/requires-recent-login"); 
        }
        throw error; // その他のエラーも再スロー
      }
    } else {
      console.warn("No user is currently signed in to delete.");
      throw new Error("No user signed in.");
    }
  };

  const value = {
    user,
    userData,
    loading,
    signUp,
    logIn: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
    logOut: () => signOut(auth),
    sendPasswordReset,
    signInWithGoogle,
    deleteAccount, // Add deleteAccount to the context value
  };

  return (
            <AuthContext.Provider value={value}>
              {children}
            </AuthContext.Provider>  );
}
