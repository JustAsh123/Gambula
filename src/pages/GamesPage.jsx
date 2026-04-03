import { useEffect } from 'react';
import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
import GameCard from '../components/shared/GameCard';
import GlassPanel from '../components/shared/GlassPanel';
import { GAME_CATALOG } from '../config/games';

const QUICK_GUIDES = [
  {
    title: 'Browse all cabinets',
    description: 'Each card shows the controls, scoring style, and a direct path into the game.',
  },
  {
    title: 'Check scores before jumping in',
    description: 'Open the leaderboards page any time to see who is leading each cabinet.',
  },
  {
    title: 'Replay instantly',
    description: 'Every game page keeps restart, pause, controls, and leaderboard details close by.',
  },
];

export default function GamesPage() {
  useEffect(() => {
    document.title = 'Games | Gambula Arcade';
  }, []);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <GlassPanel strong className="p-8">
          <p className="section-label">Games</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">Pick a cabinet and start in seconds.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
            Gambula is built for quick sessions. Browse controls up front, launch instantly, and chase your best score without digging through cluttered screens.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              to={`/games/${GAME_CATALOG[0].id}`}
            >
              Play First Cabinet
            </Button>
            <Button
              size="lg"
              to="/leaderboards"
              variant="secondary"
            >
              View Leaderboards
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <p className="section-label">Quick Guide</p>
          <div className="mt-4 space-y-3">
            {QUICK_GUIDES.map((item) => (
              <Card
                key={item.title}
                className="p-4"
              >
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-300">{item.description}</p>
              </Card>
            ))}
          </div>
        </GlassPanel>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label">Arcade Catalog</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">All playable games</h3>
          </div>
          <span className="score-pill">{GAME_CATALOG.length} cabinets ready</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {GAME_CATALOG.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              index={index}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
