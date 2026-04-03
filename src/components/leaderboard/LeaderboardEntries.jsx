import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn, formatDate, formatScore } from '../../lib/utils';
import LoadingSpinner from '../shared/LoadingSpinner';

const TOP_RANK_STYLES = [
  {
    container: 'border-brand/25 bg-brand/10',
    rank: 'border border-brand/25 bg-brand/15 text-blue-100',
  },
  {
    container: 'border-white/10 bg-white/[0.03]',
    rank: 'border border-white/10 bg-white/[0.04] text-white',
  },
  {
    container: 'border-success/20 bg-success/10',
    rank: 'border border-success/20 bg-success/10 text-green-100',
  },
];

function LeaderboardEntries({
  compact = false,
  currentUserId,
  emptyMessage = 'No scores yet - be the first to play.',
  entries = [],
  loading = false,
  loadingLabel = 'Loading leaderboard...',
}) {
  if (loading) {
    return <LoadingSpinner label={loadingLabel} />;
  }

  if (!entries.length) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm text-gray-300">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {entries.map((entry, index) => {
        const isCurrentUser = entry.userId === currentUserId;
        const topRankStyle = TOP_RANK_STYLES[index] || null;

        return (
          <motion.div
            layout
            key={entry.id}
            className={`flex items-center justify-between gap-4 rounded-2xl border ${
              compact ? 'px-3 py-3' : 'px-4 py-3'
            } ${
              isCurrentUser
                ? 'border-brand/35 bg-brand/10'
                : topRankStyle?.container || 'border-white/10 bg-[#0b0b0b]'
            }`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  compact ? 'h-8 w-8' : 'h-9 w-9'
                } ${
                  topRankStyle?.rank || 'border border-white/10 bg-[#111111] text-gray-300'
                }`}
              >
                #{index + 1}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn('truncate font-semibold text-white', compact ? 'text-sm' : 'text-sm')}>
                    {entry.username}
                  </p>
                  {isCurrentUser ? (
                    <span className="rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100">
                      You
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500">{formatDate(entry.timestamp)}</p>
              </div>
            </div>
            <span className={cn('font-semibold text-white', compact ? 'text-base' : 'text-lg')}>
              {formatScore(entry.score)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default memo(LeaderboardEntries);
