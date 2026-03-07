import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './utils/firebase';

export type AuthResult = {
  ok: boolean;
  message?: string;
};

type AuthContextValue = {
  isBootstrapping: boolean;
  currentUser: string | null;
  currentUserId: string | null;
  login: (username: string, password: string) => Promise<AuthResult>;
  signup: (username: string, password: string, confirmPassword: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const usernameToEmail = (username: string) => `${encodeURIComponent(username.trim().toLowerCase())}@stogia.local`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setCurrentUser(null);
          setCurrentUserId(null);
          return;
        }

        setCurrentUserId(user.uid);
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data() as { username?: string };
          setCurrentUser(data.username || user.email || user.uid);
        } else {
          const fallbackName = user.email?.split('@')[0] || user.uid;
          setCurrentUser(fallbackName);
          await setDoc(
            userRef,
            {
              username: fallbackName,
              usernameLower: fallbackName.toLowerCase(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch (e) {
        console.warn('Failed to resolve auth user:', e);
      } finally {
        setIsBootstrapping(false);
      }
    });

    return unsubscribe;
  }, []);

  const signup = useCallback(async (username: string, password: string, confirmPassword: string): Promise<AuthResult> => {
    const name = username.trim();
    if (!name || !password) return { ok: false, message: 'fill_required' };
    if (password.length < 4) return { ok: false, message: 'password_rule' };
    if (password !== confirmPassword) return { ok: false, message: 'password_mismatch' };

    const email = usernameToEmail(name);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(
        doc(db, 'users', credential.user.uid),
        {
          username: name,
          usernameLower: name.toLowerCase(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { ok: true };
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') return { ok: false, message: 'user_exists' };
      return { ok: false, message: 'signup_failed' };
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    const name = username.trim();
    if (!name || !password) return { ok: false, message: 'fill_required' };

    const email = usernameToEmail(name);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch {
      return { ok: false, message: 'login_failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isBootstrapping,
    currentUser,
    currentUserId,
    login,
    signup,
    logout,
  }), [currentUser, currentUserId, isBootstrapping, login, logout, signup]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
