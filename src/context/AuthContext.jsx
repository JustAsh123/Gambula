import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getFriendlyAuthError,
  logoutUser,
  registerWithEmail,
  signInWithEmail,
  signInWithGooglePopup,
  subscribeToAuth,
  updateUserDisplayName,
} from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';
import { fetchUserProfile, syncUserProfile } from '../services/profileService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshProfile = useCallback(
    async (targetUser) => {
      const activeUser = targetUser || userRef.current;

      if (!isFirebaseConfigured || !activeUser?.uid) {
        setProfile(null);
        return null;
      }

      const nextProfile = await fetchUserProfile(activeUser.uid);
      setProfile(nextProfile);
      return nextProfile;
    },
    [],
  );

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return () => {};
    }

    const stopAuthListener = subscribeToAuth(async (nextUser) => {
      setUser(nextUser);
      setLoading(true);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await syncUserProfile(nextUser);
        await refreshProfile(nextUser);
      } catch (syncError) {
        setError(syncError.message);
      } finally {
        setLoading(false);
      }
    });

    return stopAuthListener;
  }, [refreshProfile]);

  const runAuthAction = useCallback(async (action) => {
    setActionLoading(true);
    setError('');

    try {
      return await action();
    } catch (authError) {
      const message = getFriendlyAuthError(authError);
      setError(message);
      throw new Error(message);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(''), []);
  const signInWithGoogle = useCallback(
    () => runAuthAction(() => signInWithGooglePopup()),
    [runAuthAction],
  );
  const signInWithEmailAction = useCallback(
    (payload) => runAuthAction(() => signInWithEmail(payload)),
    [runAuthAction],
  );
  const signUpWithEmailAction = useCallback(
    (payload) => runAuthAction(() => registerWithEmail(payload)),
    [runAuthAction],
  );
  const signOutUser = useCallback(() => runAuthAction(() => logoutUser()), [runAuthAction]);

  const updateDisplayName = useCallback(
    async (displayName) => {
      const updatedUser = await runAuthAction(() => updateUserDisplayName(user, displayName));
      await refreshProfile(updatedUser);
      return updatedUser;
    },
    [refreshProfile, user],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      actionLoading,
      error,
      refreshProfile,
      clearError,
      signInWithGoogle,
      signInWithEmail: signInWithEmailAction,
      signUpWithEmail: signUpWithEmailAction,
      signOutUser,
      updateDisplayName,
    }),
    [
      actionLoading,
      clearError,
      error,
      loading,
      profile,
      refreshProfile,
      signInWithEmailAction,
      signInWithGoogle,
      signOutUser,
      signUpWithEmailAction,
      updateDisplayName,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
