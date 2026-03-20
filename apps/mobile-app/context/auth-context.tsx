import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { createUserProfile, getUserProfile } from '@/lib/firestore';
import type { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthProvider] mounting, registering onAuthStateChanged');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthProvider] onAuthStateChanged fired, user:', firebaseUser?.uid ?? 'null');
      setUser(firebaseUser);
      if (firebaseUser) {
        console.log('[AuthProvider] fetching user profile...');
        try {
          let p = await getUserProfile(firebaseUser.uid);
          if (!p) {
            // Profile missing (e.g. account predates Firestore setup) — auto-create it
            console.log('[AuthProvider] profile missing, auto-creating...');
            const displayName = firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User';
            await createUserProfile(firebaseUser.uid, displayName, firebaseUser.email ?? '');
            p = await getUserProfile(firebaseUser.uid);
          }
          console.log('[AuthProvider] profile fetched:', p ? 'ok' : 'still null');
          setProfile(p);
        } catch (e) {
          console.error('[AuthProvider] getUserProfile error:', e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      console.log('[AuthProvider] setting loading = false');
      setLoading(false);
    });
    return () => {
      console.log('[AuthProvider] unmounting, unsubscribing');
      unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const p = await getUserProfile(credential.user.uid);
    setProfile(p);
  }

  async function signUp(email: string, password: string, displayName: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(credential.user.uid, displayName, email);
    const p = await getUserProfile(credential.user.uid);
    setProfile(p);
  }

  async function logOut() {
    await signOut(auth);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
