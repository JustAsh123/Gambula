import { Link } from 'react-router-dom';
import ArcadeBackground from './ArcadeBackground';
import Navbar from './Navbar';

export default function AppShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArcadeBackground />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="font-medium text-white">Gambula</p>
            <p className="mt-1">Arcade games, focused leaderboards, and fast restarts.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              className="link-subtle"
              to="/"
            >
              Home
            </Link>
            <Link
              className="link-subtle"
              to="/games"
            >
              Games
            </Link>
            <Link
              className="link-subtle"
              to="/leaderboards"
            >
              Leaderboards
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
