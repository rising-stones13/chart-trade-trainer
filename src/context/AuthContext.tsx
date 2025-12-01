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
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'; // Add deleteDoc, onSnapshot

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
    logIn: (email: string, password: string) => Promise<UserCredential>;
    logOut: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    logInWithGoogle: () => Promise<void>; // Updated from signInWithGoogle
    signUpWithGoogle: () => Promise<void>; // New function for Google signup
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
      let unsubscribeFromUserData: (() => void) | undefined;
  
          const unsubscribeFromAuth = onAuthStateChanged(auth, async (user) => {
  
            setUser(user);
  
            if (user) {
  
              // Sync Stripe status in the background
  
              (async () => {
  
                try {
  
                  const token = await user.getIdToken();
  
                  await fetch('/api/sync-stripe-status', {
  
                    method: 'POST',
  
                    headers: {
  
                      'Authorization': `Bearer ${token}`,
  
                    },
  
                  });
  
                  console.log('AuthContext: Stripe status sync requested.');
  
                } catch (error) {
  
                  console.error('AuthContext: Error syncing Stripe status:', error);
  
                }
  
              })();
      
              const userDocRef = doc(db, 'users', user.uid);
  
              // Subscribe to user data changes
  
              unsubscribeFromUserData = onSnapshot(userDocRef, (doc) => {
  
                        if (doc.exists()) {
  
                          const data = doc.data() as UserData;
  
                          setUserData(data);
  
                          console.log('AuthContext: User data updated, isPremium:', data.isPremium); // Add this log
  
                        } else {
  
                          setUserData(null);
  
                          console.log('AuthContext: User document does not exist.'); // Add this log
  
                        }
  
                      });      
  
          } else {
          // If user logs out, clear user data and unsubscribe from user data changes
          if (unsubscribeFromUserData) {
            unsubscribeFromUserData();
            unsubscribeFromUserData = undefined; // Reset for next login
          }
          setUserData(null);
        }
        setLoading(false);
      });
  
      return () => {
        // Unsubscribe from auth state changes
        unsubscribeFromAuth();
        // Unsubscribe from user data changes if it was active
        if (unsubscribeFromUserData) {
          unsubscribeFromUserData();
        }
      };
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
  
    const logInWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      try {
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;
  
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
  
        if (!userDoc.exists()) {
          // If user does not exist in Firestore, throw an error
          await signOut(auth); // Log out the user from Firebase Auth as they are not registered in our DB
          throw new Error("User not registered. Please sign up first.");
        } else {
          setUserData(userDoc.data() as UserData);
        }
      } catch (error) {
        console.error("Error during Google sign-in", error);
        throw error;
      }
    };
  
    const signUpWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      try {
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;
  
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
  
        if (userDoc.exists()) {
          // If user already exists in Firestore, throw an error
          await signOut(auth); // Log out the user from Firebase Auth to prevent unintended login
          throw new Error("User already registered. Please log in instead.");
        } else {
          await setDoc(userDocRef, {
            email: user.email,
            isPremium: false,
          });
          const newUserDoc = await getDoc(userDocRef);
          if (newUserDoc.exists()){
               setUserData(newUserDoc.data() as UserData);
          }
        }
      } catch (error) {
        console.error("Error during Google sign-up", error);
        throw error;
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
      logInWithGoogle, // Updated
      signUpWithGoogle, // New
      deleteAccount,
    };
  
    return (
              <AuthContext.Provider value={value}>
                {children}
              </AuthContext.Provider>  );
  }
