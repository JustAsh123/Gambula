import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase';
import { syncUserProfile } from './profileService';

function ensureConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured yet.');
  }
}

export function subscribeToAuth(listener) {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  return onAuthStateChanged(auth, listener);
}

export async function signInWithGooglePopup() {
  ensureConfigured();
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithEmail({ email, password }) {
  ensureConfigured();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmail({ email, password, displayName }) {
  ensureConfigured();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await syncUserProfile(result.user, displayName);
  return result.user;
}

export async function logoutUser() {
  ensureConfigured();
  await signOut(auth);
}

export async function updateUserDisplayName(user, displayName) {
  ensureConfigured();

  if (!user) {
    throw new Error('You need to be logged in to update your profile.');
  }

  await updateProfile(user, { displayName });
  await syncUserProfile({ ...user, displayName }, displayName);
  return { ...user, displayName };
}

export function getFriendlyAuthError(error) {
  const code = error?.code || '';
  const fallback = error?.message || 'Something went wrong. Please try again.';

  const map = {
    'auth/email-already-in-use': 'That email is already in use.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'Your email or password is incorrect.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/weak-password': 'Use a stronger password with at least 6 characters.',
  };

  return map[code] || fallback;
}
