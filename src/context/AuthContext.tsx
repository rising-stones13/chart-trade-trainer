'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  onAuthStateChanged, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  UserCredential,
  GoogleAuthProvider,
  signInWithRedirect,
  deleteUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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
  logInWithGoogle: () => Promise<void>;
  signUpWithGoogle: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
  const router = useRouter();
  const pathname = usePathname();

  // Step 1: Handle authentication state changes
  useEffect(() => {
    const unsubscribeFromAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribeFromAuth();
  }, []);

  // Step 2: Handle data fetching, document creation, and redirection based on user state
  useEffect(() => {
    let unsubscribeFromUserData: (() => void) | undefined;

    if (user) {
      // Redirect away from login page if user is now logged in
      if (pathname === '/login') {
        router.push('/');
      }
      
      const userDocRef = doc(db, 'users', user.uid);

      unsubscribeFromUserData = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {
          console.log("User document does not exist, creating it.");
          try {
            await setDoc(userDocRef, { email: user.email, isPremium: false });
          } catch (error) {
            console.error("Failed to create user document:", error);
          }
        }
      }, (error) => {
        console.error("Firestore onSnapshot listener error:", error);
      });

      // Sync Stripe status once per login
      user.getIdToken()
        .then(token => fetch('/api/sync-stripe-status', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        }))
        .catch(e => console.error('Stripe sync fetch failed:', e));

    } else {
      // User is null, clear user data
      setUserData(null);
    }

    return () => {
      if (unsubscribeFromUserData) {
        unsubscribeFromUserData();
      }
    };
  }, [user, router, pathname]);

  const signUp = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);
  };

  const signUpWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);
  };

  const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await deleteDoc(userDocRef);
        await deleteUser(currentUser);
      } catch (error: any) {
        console.error("Error deleting user account:", error);
        if (error.code === 'auth/requires-recent-login') {
          throw new Error("auth/requires-recent-login");
        }
        throw error;
      }
    } else {
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
    logInWithGoogle,
    signUpWithGoogle,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
