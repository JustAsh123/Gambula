import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/shared/Button';
import GlassPanel from '../components/shared/GlassPanel';
import { useAuth } from '../context/AuthContext';
import { firebaseSetupMessage, isFirebaseConfigured } from '../services/firebase';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    actionLoading,
    clearError,
    error,
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    user,
  } = useAuth();
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'signin');
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    document.title = 'Login | Gambula Arcade';
  }, []);

  useEffect(() => {
    const nextMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
    setMode(nextMode);
  }, [searchParams]);

  async function handleGoogleLogin() {
    setLocalError('');
    await signInWithGoogle();
    navigate('/profile');
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setLocalError('');
    await signInWithEmail(signInForm);
    navigate('/profile');
  }

  async function handleSignUp(event) {
    event.preventDefault();
    setLocalError('');

    if (signUpForm.password !== signUpForm.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    await signUpWithEmail({
      email: signUpForm.email,
      password: signUpForm.password,
      displayName: signUpForm.displayName,
    });
    navigate('/profile');
  }

  function switchMode(nextMode) {
    setLocalError('');
    clearError();
    setMode(nextMode);
    setSearchParams({ mode: nextMode });
  }

  if (!isFirebaseConfigured) {
    return (
      <GlassPanel className="mx-auto max-w-3xl p-8">
        <p className="section-label">Firebase Setup</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Authentication is almost ready</h2>
        <p className="mt-4 text-sm leading-6 text-gray-300">{firebaseSetupMessage}</p>
      </GlassPanel>
    );
  }

  if (user) {
    return (
      <GlassPanel className="mx-auto max-w-3xl p-8 text-center">
        <p className="section-label">Account Ready</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">You are already signed in</h2>
        <p className="mt-4 text-sm leading-6 text-gray-300">
          Head to your profile to see your best scores or jump back into the arcade.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            to="/profile"
          >
            Open Profile
          </Button>
          <Button
            to="/"
            variant="secondary"
          >
            Back To Dashboard
          </Button>
        </div>
      </GlassPanel>
    );
  }

  const surfaceError = localError || error;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr,1.05fr]">
      <GlassPanel strong className="p-8">
        <p className="section-label">Account Access</p>
        <h2 className="mt-3 text-4xl font-semibold text-white">Save scores automatically and track your best runs.</h2>
        <p className="mt-4 text-sm leading-7 text-gray-300">
          You can play as a guest, but signing in lets Gambula save your scores at the end of each game and keep your profile in sync.
        </p>
        <div className="mt-8 space-y-3 text-sm text-gray-300">
          <div className="rounded-2xl border border-white/10 bg-black px-4 py-4">
            Automatic score saving on game over
          </div>
          <div className="rounded-2xl border border-white/10 bg-black px-4 py-4">
            Dedicated leaderboard inside every game page
          </div>
          <div className="rounded-2xl border border-white/10 bg-black px-4 py-4">
            Profile stats across every game
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-8">
        <div className="flex gap-3">
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'signin'
                ? 'bg-brand text-white'
                : 'bg-[#111111] text-gray-300 hover:bg-[#171717] hover:text-white'
            }`}
            onClick={() => switchMode('signin')}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'signup'
                ? 'bg-brand text-white'
                : 'bg-[#111111] text-gray-300 hover:bg-[#171717] hover:text-white'
            }`}
            onClick={() => switchMode('signup')}
            type="button"
          >
            Create Account
          </button>
        </div>

        <Button
          className="mt-6 w-full"
          disabled={actionLoading}
          onClick={handleGoogleLogin}
          variant="secondary"
        >
          Continue With Google
        </Button>

        <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.22em] text-gray-500">
          <span className="h-px flex-1 bg-white/10" />
          <span>or use email</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {mode === 'signin' ? (
          <form
            className="space-y-4"
            onSubmit={handleSignIn}
          >
            <div>
              <label className="mb-2 block text-sm text-gray-300">Email</label>
              <input
                className="input-neon"
                onChange={(event) =>
                  setSignInForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="you@example.com"
                required
                type="email"
                value={signInForm.email}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Password</label>
              <input
                className="input-neon"
                onChange={(event) =>
                  setSignInForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Enter your password"
                required
                type="password"
                value={signInForm.password}
              />
            </div>
            <Button
              className="w-full"
              disabled={actionLoading}
              type="submit"
            >
              {actionLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={handleSignUp}
          >
            <div>
              <label className="mb-2 block text-sm text-gray-300">Display name</label>
              <input
                className="input-neon"
                onChange={(event) =>
                  setSignUpForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                placeholder="Neon Ace"
                required
                type="text"
                value={signUpForm.displayName}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Email</label>
              <input
                className="input-neon"
                onChange={(event) =>
                  setSignUpForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="you@example.com"
                required
                type="email"
                value={signUpForm.email}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Password</label>
              <input
                className="input-neon"
                onChange={(event) =>
                  setSignUpForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Choose a password"
                required
                type="password"
                value={signUpForm.password}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Confirm password</label>
              <input
                className="input-neon"
                onChange={(event) =>
                  setSignUpForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                placeholder="Repeat your password"
                required
                type="password"
                value={signUpForm.confirmPassword}
              />
            </div>
            <Button
              className="w-full"
              disabled={actionLoading}
              type="submit"
            >
              {actionLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        )}

        {surfaceError ? (
          <p className="status-error mt-4">
            {surfaceError}
          </p>
        ) : null}
      </GlassPanel>
    </div>
  );
}
