import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
import GlassPanel from '../components/shared/GlassPanel';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { GAME_CATALOG } from '../config/games';
import { formatScore } from '../lib/utils';
import { firebaseSetupMessage, isFirebaseConfigured } from '../services/firebase';

export default function ProfilePage() {
  const { actionLoading, loading, profile, updateDisplayName, user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    document.title = 'Profile | Gambula Arcade';
  }, []);

  useEffect(() => {
    setDisplayName(profile?.username || user?.displayName || '');
  }, [profile, user]);

  async function handleSave(event) {
    event.preventDefault();
    await updateDisplayName(displayName);
    setSavedMessage('Display name updated.');
  }

  if (!isFirebaseConfigured) {
    return (
      <GlassPanel className="mx-auto max-w-3xl p-8">
        <p className="section-label">Firebase Setup</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Profile stats need Firebase</h2>
        <p className="mt-4 text-sm leading-6 text-gray-300">{firebaseSetupMessage}</p>
      </GlassPanel>
    );
  }

  if (loading) {
    return (
      <GlassPanel className="mx-auto max-w-3xl p-8">
        <LoadingSpinner label="Loading your profile..." />
      </GlassPanel>
    );
  }

  if (!user) {
    return (
      <GlassPanel className="mx-auto max-w-3xl p-8 text-center">
        <p className="section-label">Sign In Required</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Log in to view your arcade profile</h2>
        <p className="mt-4 text-sm leading-6 text-gray-300">
          Your best scores and submission history are linked to your account.
        </p>
        <Button
          className="mt-8"
          to="/auth"
        >
          Open Login
        </Button>
      </GlassPanel>
    );
  }

  const gameScores = profile?.gameScores || {};
  const activeGames = Object.values(gameScores).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <GlassPanel strong className="grid gap-6 p-8 lg:grid-cols-[1.2fr,0.8fr]">
        <div>
          <p className="section-label">Pilot Profile</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">
            {profile?.username || user.displayName || 'Arcade Pilot'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-300">{user.email}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="score-pill">
              Bests Recorded {formatScore(activeGames)} / {GAME_CATALOG.length}
            </span>
            <span className="score-pill">
              Submissions {formatScore(profile?.totalSubmissions || 0)}
            </span>
          </div>
        </div>

        <GlassPanel className="p-5">
          <form
            className="space-y-4"
            onSubmit={handleSave}
          >
            <div>
              <label className="mb-2 block text-sm text-gray-300">Display name</label>
              <input
                className="input-neon"
                onChange={(event) => {
                  setSavedMessage('');
                  setDisplayName(event.target.value);
                }}
                required
                type="text"
                value={displayName}
              />
            </div>
            <Button
              className="w-full"
              disabled={actionLoading}
              type="submit"
            >
              {actionLoading ? 'Saving...' : 'Save Name'}
            </Button>
            {savedMessage ? (
              <p className="status-success">
                {savedMessage}
              </p>
            ) : null}
          </form>
        </GlassPanel>
      </GlassPanel>

      <GlassPanel className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-label">Best Scores</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Your cabinet records</h3>
          </div>
          <span className="score-pill">Cloud-synced</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GAME_CATALOG.map((game) => (
            <Card
              key={game.id}
              className="p-4"
              interactive
            >
              <p className="text-sm font-semibold text-white">{game.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-gray-500">{game.badge}</p>
              <p className="mt-4 text-2xl font-semibold text-white">
                {formatScore(gameScores[game.id] || 0)}
              </p>
              <Link
                className="link-subtle mt-4 inline-flex"
                to={`/games/${game.id}`}
              >
                Play Again
              </Link>
            </Card>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
