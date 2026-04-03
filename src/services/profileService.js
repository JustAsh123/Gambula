import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

function resolveUsername(user, overrideName) {
  return overrideName || user?.displayName || user?.email?.split('@')[0] || 'Arcade Pilot';
}

export async function syncUserProfile(user, overrideName) {
  if (!isFirebaseConfigured || !user) {
    return null;
  }

  const username = resolveUsername(user, overrideName);
  const profileRef = doc(db, 'profiles', user.uid);

  await setDoc(
    profileRef,
    {
      userId: user.uid,
      username,
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { userId: user.uid, username };
}

export async function fetchUserProfile(userId) {
  if (!isFirebaseConfigured || !userId) {
    return null;
  }

  const snapshot = await getDoc(doc(db, 'profiles', userId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
