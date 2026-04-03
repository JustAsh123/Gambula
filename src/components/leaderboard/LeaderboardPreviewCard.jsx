import { memo, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firebaseSetupMessage, isFirebaseConfigured } from '../../services/firebase';
import { fetchLeaderboard } from '../../services/leaderboardService';
import Button from '../shared/Button';
import Card from '../shared/Card';
import LeaderboardEntries from './LeaderboardEntries';

function LeaderboardPreviewCard({
  game,
  fullLeaderboardTo,
  limitCount = 5,
  onOpen,
  showPlayButton = true,
  showViewButton = true,
}) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const loadEntries = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextEntries = await fetchLeaderboard(game.id, limitCount);
      setEntries(nextEntries);
    } finally {
      setLoading(false);
    }
  }, [game.id, limitCount]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  return (
    <Card
      className="h-full p-5"
      interactive
      strong
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">{game.badge}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{game.name}</h3>
          </div>
          <span className="score-pill">Top {limitCount}</span>
        </div>

        <p className="text-sm leading-6 text-gray-300">{game.description}</p>

        {!isFirebaseConfigured ? (
          <p className="text-sm leading-6 text-gray-300">{firebaseSetupMessage}</p>
        ) : (
          <LeaderboardEntries
            compact
            currentUserId={user?.uid}
            entries={entries}
            loading={loading}
            loadingLabel={`Loading ${game.name} scores...`}
          />
        )}

        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          {showViewButton ? (
            fullLeaderboardTo ? (
              <Button
                className="flex-1"
                to={fullLeaderboardTo}
                variant="secondary"
              >
                View Full Board
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={() => onOpen?.(game.id)}
                variant="secondary"
              >
                View Full Board
              </Button>
            )
          ) : null}
          {showPlayButton ? (
            <Button
              className="flex-1"
              to={`/games/${game.id}`}
            >
              Play Game
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default memo(LeaderboardPreviewCard);
