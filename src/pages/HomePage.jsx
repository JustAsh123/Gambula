import { useEffect } from 'react';
import { motion } from 'framer-motion';
import LeaderboardPreviewCard from '../components/leaderboard/LeaderboardPreviewCard';
import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
import GameCard from '../components/shared/GameCard';
import GlassPanel from '../components/shared/GlassPanel';
import { GAME_CATALOG } from '../config/games';
import { firebaseSetupMessage, isFirebaseConfigured } from '../services/firebase';

const FEATURE_LIST = [
  {
    title: 'Multiple arcade games',
    description: 'Jump between quick, replayable cabinets without waiting on heavy assets.',
  },
  {
    title: 'Competitive leaderboards',
    description: 'Every game keeps its own top players, with one best score per user.',
  },
  {
    title: 'Instant gameplay',
    description: 'Open a game, play immediately, and restart without leaving the page.',
  },
  {
    title: 'Track your best scores',
    description: 'Signed-in players keep their best results synced and easy to revisit.',
  },
];

const PREVIEW_GAMES = GAME_CATALOG.slice(0, 4);
const PREVIEW_LEADERBOARDS = [GAME_CATALOG[0], GAME_CATALOG[2]];

export default function HomePage() {
  useEffect(() => {
    document.title = 'Gambula Arcade';
  }, []);

  return (
    <div className="space-y-12">
      <section className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-strong p-8 sm:p-10"
          initial={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.35 }}
        >
          <p className="section-label">Arcade Landing</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Play. Compete. Climb the Leaderboard.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-300 sm:text-lg">
            Fast, addictive arcade games with real competition.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              to="/games"
            >
              Start Playing
            </Button>
            <Button
              size="lg"
              to="/leaderboards"
              variant="secondary"
            >
              View Leaderboards
            </Button>
          </div>

          {!isFirebaseConfigured ? (
            <div className="status-info mt-6">
              {firebaseSetupMessage}
            </div>
          ) : null}
        </motion.div>

        <GlassPanel className="grid gap-4 p-6">
          <div>
            <p className="section-label">Why Players Stay</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Quick sessions, clear competition</h3>
          </div>

          <div className="grid gap-3">
            {FEATURE_LIST.slice(0, 3).map((item) => (
              <Card
                key={item.title}
                className="p-4"
              >
                <h4 className="text-base font-semibold text-white">{item.title}</h4>
                <p className="mt-2 text-sm leading-6 text-gray-300">{item.description}</p>
              </Card>
            ))}
          </div>
        </GlassPanel>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label">Features</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">Built for short runs and real score chasing</h3>
          </div>
          <span className="score-pill">{GAME_CATALOG.length} playable cabinets</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURE_LIST.map((feature) => (
            <Card
              key={feature.title}
              className="p-5"
              interactive
            >
              <h4 className="text-lg font-semibold text-white">{feature.title}</h4>
              <p className="mt-3 text-sm leading-6 text-gray-300">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label">Game Preview</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">Jump into the most popular cabinets</h3>
          </div>
          <Button
            to="/games"
            variant="secondary"
          >
            View All Games
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PREVIEW_GAMES.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label">Leaderboard Preview</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">See who is leading right now</h3>
          </div>
          <Button
            to="/leaderboards"
            variant="secondary"
          >
            Explore All Boards
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {PREVIEW_LEADERBOARDS.map((game) => (
            <LeaderboardPreviewCard
              key={game.id}
              fullLeaderboardTo={`/leaderboards?game=${game.id}`}
              game={game}
              limitCount={5}
              showPlayButton={false}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
