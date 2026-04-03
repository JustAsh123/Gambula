import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import LeaderboardPanel from '../components/leaderboard/LeaderboardPanel';
import LeaderboardPreviewCard from '../components/leaderboard/LeaderboardPreviewCard';
import Button from '../components/shared/Button';
import GlassPanel from '../components/shared/GlassPanel';
import { GAME_CATALOG, getGameById } from '../config/games';

export default function LeaderboardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeGameId = searchParams.get('game') || GAME_CATALOG[0].id;
  const activeGame = useMemo(
    () => getGameById(activeGameId) || GAME_CATALOG[0],
    [activeGameId],
  );

  useEffect(() => {
    document.title = 'Leaderboards | Gambula Arcade';
  }, []);

  function openLeaderboard(gameId) {
    setSearchParams({ game: gameId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <GlassPanel strong className="p-8">
          <p className="section-label">Leaderboards</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">See the top scores without launching a game.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
            Every cabinet has its own board. Scores show each player once, using only their best run for that game.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              to="/games"
            >
              Browse Games
            </Button>
            <Button
              size="lg"
              to={`/games/${activeGame.id}`}
              variant="secondary"
            >
              Play {activeGame.name}
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <p className="section-label">How It Works</p>
          <div className="mt-4 space-y-3 text-sm text-gray-300">
            <div className="rounded-2xl border border-white/10 bg-black px-4 py-4">
              Leaderboards rank players by best score only, so each user appears once per game.
            </div>
            <div className="rounded-2xl border border-white/10 bg-black px-4 py-4">
              Preview cards show the top 5. The focused board below expands the selected game to the top 10.
            </div>
            <div className="rounded-2xl border border-white/10 bg-black px-4 py-4">
              Tap any game filter or card to jump straight to that cabinet&apos;s full board.
            </div>
          </div>
        </GlassPanel>
      </section>

      <section className="space-y-4">
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-label">Focused Board</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{activeGame.name}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Switch games below to explore every cabinet leaderboard.
              </p>
            </div>
            <span className="score-pill">Top 10</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {GAME_CATALOG.map((game) => (
              <button
                key={game.id}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  game.id === activeGame.id
                    ? 'border-brand/30 bg-brand/15 text-white'
                    : 'border-white/10 bg-[#111111] text-gray-300 hover:border-white/20 hover:bg-[#171717] hover:text-white'
                }`}
                onClick={() => openLeaderboard(game.id)}
                type="button"
              >
                {game.name}
              </button>
            ))}
          </div>
        </GlassPanel>

        <LeaderboardPanel
          gameId={activeGame.id}
          limitCount={10}
          title={`${activeGame.name} Top Scores`}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label">All Leaderboards</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">Preview every cabinet</h3>
          </div>
          <span className="score-pill">Top 5 previews</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {GAME_CATALOG.map((game) => (
            <LeaderboardPreviewCard
              key={game.id}
              game={game}
              limitCount={5}
              onOpen={openLeaderboard}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
