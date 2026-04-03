import { useEffect, useRef, useState } from 'react';
import { randomInt } from '../lib/utils';
import { playArcadeTone } from '../lib/sound';

const MAX_MISTAKES = 3;
const BASE_WINDOW_MS = 1180;
const MIN_WINDOW_MS = 340;
const BASE_TARGET_SIZE = 80;
const MIN_TARGET_SIZE = 44;
const BASE_POINTS = 120;

function createRuntime() {
  return {
    phase: 'waiting',
    message: 'Wait for green. Early clicks cost a mistake.',
    score: 0,
    successfulReactions: 0,
    mistakes: 0,
    streak: 0,
    peakStreak: 0,
    bestReactionMs: null,
    totalReactionMs: 0,
    totalSpeedBonus: 0,
    totalStreakBonus: 0,
    reactionWindowMs: BASE_WINDOW_MS,
    target: {
      x: 36,
      y: 28,
      size: BASE_TARGET_SIZE,
    },
    startedAt: Date.now(),
    visibleAt: 0,
    finished: false,
  };
}

function createSnapshot(runtime) {
  const averageReactionMs = runtime.successfulReactions
    ? Math.round(runtime.totalReactionMs / runtime.successfulReactions)
    : 0;

  return {
    phase: runtime.phase,
    message: runtime.message,
    score: runtime.score,
    successfulReactions: runtime.successfulReactions,
    mistakes: runtime.mistakes,
    streak: runtime.streak,
    peakStreak: runtime.peakStreak,
    bestReactionMs: runtime.bestReactionMs,
    averageReactionMs,
    reactionWindowMs: runtime.reactionWindowMs,
    target: runtime.target,
  };
}

function getReactionWindow(successfulReactions) {
  return Math.max(MIN_WINDOW_MS, BASE_WINDOW_MS - successfulReactions * 16);
}

function getTargetSize(successfulReactions) {
  return Math.max(MIN_TARGET_SIZE, BASE_TARGET_SIZE - successfulReactions * 0.9);
}

function getNextDelay(successfulReactions) {
  const minDelay = Math.max(320, 680 - successfulReactions * 8);
  const maxDelay = Math.max(minDelay + 180, 1320 - successfulReactions * 10);
  return randomInt(minDelay, maxDelay);
}

export default function ReactionClickerGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const runtimeRef = useRef(createRuntime());
  const timersRef = useRef(new Set());
  const [uiState, setUiState] = useState(() => createSnapshot(runtimeRef.current));

  function syncUi() {
    setUiState(createSnapshot(runtimeRef.current));
  }

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }

  function queueTimer(callback, delay) {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);

      if (pauseStateRef?.current) {
        queueTimer(callback, 120);
        return;
      }

      callback();
    }, delay);

    timersRef.current.add(timer);
    return timer;
  }

  function finishGame(reason) {
    const runtime = runtimeRef.current;

    if (runtime.finished) {
      return;
    }

    runtime.finished = true;
    runtime.phase = 'game-over';
    runtime.message = reason;
    clearTimers();
    syncUi();
    playArcadeTone('fail');

    onGameOver({
      score: runtime.score,
      session: {
        durationMs: Date.now() - runtime.startedAt,
        successfulReactions: runtime.successfulReactions,
        mistakesMade: runtime.mistakes,
        bestReactionMs: runtime.bestReactionMs || 0,
        averageReactionMs: runtime.successfulReactions
          ? Math.round(runtime.totalReactionMs / runtime.successfulReactions)
          : 0,
        totalSpeedBonus: runtime.totalSpeedBonus,
        totalStreakBonus: runtime.totalStreakBonus,
      },
    });
  }

  function registerMistake(message) {
    const runtime = runtimeRef.current;

    if (runtime.finished || runtime.phase === 'game-over') {
      return;
    }

    clearTimers();
    runtime.mistakes += 1;
    runtime.streak = 0;
    runtime.phase = 'feedback';
    runtime.message = message;

    if (runtime.mistakes >= MAX_MISTAKES) {
      finishGame('Reaction limit reached. Three mistakes ends the run.');
      return;
    }

    syncUi();
    playArcadeTone('fail');
    queueNextRound(620);
  }

  function queueNextRound(delay = 420) {
    const runtime = runtimeRef.current;

    if (runtime.finished) {
      return;
    }

    runtime.phase = 'waiting';
    runtime.message = 'Wait for green. Early clicks cost a mistake.';
    runtime.reactionWindowMs = getReactionWindow(runtime.successfulReactions);
    runtime.target = {
      x: randomInt(8, 80),
      y: randomInt(12, 66),
      size: getTargetSize(runtime.successfulReactions),
    };
    syncUi();

    queueTimer(() => {
      const liveRuntime = runtimeRef.current;

      if (liveRuntime.finished) {
        return;
      }

      liveRuntime.phase = 'active';
      liveRuntime.message = 'Go! Hit the green target now.';
      liveRuntime.visibleAt = performance.now();
      syncUi();

      queueTimer(
        () => registerMistake('Too slow! The reaction window closed.'),
        liveRuntime.reactionWindowMs,
      );
    }, delay + getNextDelay(runtime.successfulReactions));
  }

  function handleTargetClick() {
    const runtime = runtimeRef.current;

    if (runtime.phase !== 'active' || pauseStateRef?.current || runtime.finished) {
      return;
    }

    clearTimers();

    const reactionMs = Math.round(performance.now() - runtime.visibleAt);

    if (reactionMs > runtime.reactionWindowMs) {
      registerMistake('Too slow! The reaction window closed.');
      return;
    }

    const nextStreak = runtime.streak + 1;
    const speedBonus = Math.max(10, Math.round((runtime.reactionWindowMs - reactionMs) * 0.35));
    const streakBonus = Math.min(80, Math.max(0, (nextStreak - 1) * 10));
    const points = BASE_POINTS + speedBonus + streakBonus;

    runtime.successfulReactions += 1;
    runtime.streak = nextStreak;
    runtime.peakStreak = Math.max(runtime.peakStreak, nextStreak);
    runtime.score += points;
    runtime.totalReactionMs += reactionMs;
    runtime.totalSpeedBonus += speedBonus;
    runtime.totalStreakBonus += streakBonus;
    runtime.bestReactionMs = runtime.bestReactionMs
      ? Math.min(runtime.bestReactionMs, reactionMs)
      : reactionMs;
    runtime.phase = 'feedback';
    runtime.message = `+${points} points in ${reactionMs} ms. Keep the streak alive.`;
    syncUi();

    onScoreChange(runtime.score);
    playArcadeTone(nextStreak >= 5 ? 'success' : 'score');
    queueNextRound(420);
  }

  function handleArenaClick() {
    const runtime = runtimeRef.current;

    if (pauseStateRef?.current || runtime.finished) {
      return;
    }

    if (runtime.phase === 'waiting') {
      registerMistake('Too early! Wait until the arena turns green.');
      return;
    }

    if (runtime.phase === 'active') {
      registerMistake('Missed the target. Stay sharp.');
    }
  }

  useEffect(() => {
    runtimeRef.current = createRuntime();
    setUiState(createSnapshot(runtimeRef.current));
    onScoreChange(0);
    queueNextRound(540);

    return () => {
      clearTimers();
    };
  }, [onScoreChange]);

  const mistakesLeft = Math.max(0, MAX_MISTAKES - uiState.mistakes);

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="section-label">Reflex Rush</p>
          <p className="mt-1 text-sm leading-6 text-gray-300">{uiState.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="score-pill">Score {uiState.score}</span>
          <span className="score-pill">Hits {uiState.successfulReactions}</span>
          <span className="score-pill">Mistakes left {mistakesLeft}</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Best Reaction</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {uiState.bestReactionMs ? `${uiState.bestReactionMs} ms` : '--'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Average</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {uiState.averageReactionMs ? `${uiState.averageReactionMs} ms` : '--'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Streak</p>
          <p className="mt-1 text-lg font-semibold text-white">x{Math.max(1, uiState.streak)}</p>
        </div>
      </div>

      <div
        className="relative mx-auto flex h-[18rem] w-full max-w-[36rem] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_42%),linear-gradient(180deg,rgba(10,10,10,0.96),rgba(0,0,0,0.98))] p-3 sm:h-[19rem]"
        onClick={handleArenaClick}
        role="presentation"
      >
        <div className="absolute inset-0 bg-neon-grid opacity-15" style={{ backgroundSize: '46px 46px' }} />
        <div className="relative h-full w-full">
          {uiState.phase === 'active' ? (
            <button
              className="absolute rounded-full border border-green-200/40 bg-green-400/85 transition hover:scale-105 active:scale-[0.98]"
              onClick={(event) => {
                event.stopPropagation();
                handleTargetClick();
              }}
              style={{
                left: `${uiState.target.x}%`,
                top: `${uiState.target.y}%`,
                width: `${uiState.target.size}px`,
                height: `${uiState.target.size}px`,
              }}
              type="button"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <div
                  className={`mx-auto h-20 w-20 rounded-full border ${
                    uiState.phase === 'feedback'
                      ? 'border-blue-300/30 bg-blue-400/15'
                      : 'border-white/10 bg-white/5'
                  }`}
                />
                <p className="mt-5 text-xs uppercase tracking-[0.35em] text-gray-500">
                  {uiState.phase === 'game-over' ? 'Run ended' : uiState.phase === 'feedback' ? 'Resetting' : 'Hold'}
                </p>
                <p className="mt-3 text-sm leading-6 text-gray-300">
                  Endless mode stays live until you burn through three mistakes. Reaction windows shrink every few hits.
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.28em] text-gray-500">
                  Window {uiState.reactionWindowMs} ms
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
