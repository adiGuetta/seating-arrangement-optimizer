import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { auth } from './firebase';
import { CONFIG } from './config';
import {
  onAuthStateChanged, signInWithPopup, signInWithCredential, signOut,
  GoogleAuthProvider, User,
} from 'firebase/auth';

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setLoading(false); }), []);

  // Native Google Sign-In requires a one-time configure() call at app startup.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: CONFIG.GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS === 'web') {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } else {
      const { GoogleSignin, isSuccessResponse } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // cancelled

      // More reliable than reading response.data.idToken directly.
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error('Google Sign-In failed: no idToken');

      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    }
  }, []);

  const logout = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      try { await GoogleSignin.signOut(); } catch (_) {}
    }
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
