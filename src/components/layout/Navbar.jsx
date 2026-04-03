import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../shared/Button';
import { getSoundEnabled, playArcadeTone, setSoundEnabled } from '../../lib/sound';
import { getInitials } from '../../lib/utils';

export default function Navbar() {
  const { user, profile, signOutUser, actionLoading } = useAuth();
  const [soundOn, setSoundOn] = useState(getSoundEnabled);
  const displayName = profile?.username || user?.displayName || user?.email?.split('@')[0];
  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/games', label: 'Games' },
    { to: '/leaderboards', label: 'Leaderboards' },
  ];

  async function handleSignOut() {
    await signOutUser();
  }

  function handleSoundToggle() {
    const nextValue = !soundOn;
    setSoundOn(nextValue);
    setSoundEnabled(nextValue);
    playArcadeTone('click');
  }

  return (
    <header className="relative z-20 border-b border-white/10 bg-black/85 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            className="flex items-center gap-3"
            to="/"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-sm font-semibold text-white">
              GB
            </div>
            <div>
              <p className="section-label">Arcade Hub</p>
              <h1 className="text-xl font-semibold tracking-wide text-white">Gambula</h1>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="min-w-[100px]"
              onClick={handleSoundToggle}
              size="sm"
              variant="secondary"
            >
              Sound {soundOn ? 'On' : 'Off'}
            </Button>

            {user ? (
              <>
                <Link
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111111] px-3 py-2 text-sm text-white transition hover:border-white/20 hover:bg-[#171717]"
                  to="/profile"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-semibold text-gray-100">
                    {getInitials(displayName)}
                  </span>
                  <span className="hidden sm:block">{displayName}</span>
                </Link>
                <Button
                  disabled={actionLoading}
                  onClick={handleSignOut}
                  size="sm"
                  variant="secondary"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  to="/auth?mode=signin"
                  variant="secondary"
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  to="/auth?mode=signup"
                  variant="primary"
                >
                  Signup
                </Button>
              </>
            )}
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#111111] text-white'
                    : 'text-gray-300 hover:bg-[#111111] hover:text-white'
                }`
              }
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
