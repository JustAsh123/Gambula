import { Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import PageTransition from './components/layout/PageTransition';
import PageLoader from './components/shared/PageLoader';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const GamesPage = lazy(() => import('./pages/GamesPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const LeaderboardsPage = lazy(() => import('./pages/LeaderboardsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

export default function App() {
  const location = useLocation();

  return (
    <AppShell>
      <Suspense fallback={<PageLoader label="Loading arcade systems..." />}>
        <AnimatePresence mode="wait">
          <Routes
            key={location.pathname}
            location={location}
          >
            <Route
              path="/"
              element={
                <PageTransition>
                  <HomePage />
                </PageTransition>
              }
            />
            <Route
              path="/games"
              element={
                <PageTransition>
                  <GamesPage />
                </PageTransition>
              }
            />
            <Route
              path="/leaderboards"
              element={
                <PageTransition>
                  <LeaderboardsPage />
                </PageTransition>
              }
            />
            <Route
              path="/games/:gameId"
              element={
                <PageTransition>
                  <GamePage />
                </PageTransition>
              }
            />
            <Route
              path="/auth"
              element={
                <PageTransition>
                  <AuthPage />
                </PageTransition>
              }
            />
            <Route
              path="/profile"
              element={
                <PageTransition>
                  <ProfilePage />
                </PageTransition>
              }
            />
            <Route
              path="*"
              element={
                <PageTransition>
                  <NotFoundPage />
                </PageTransition>
              }
            />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </AppShell>
  );
}
