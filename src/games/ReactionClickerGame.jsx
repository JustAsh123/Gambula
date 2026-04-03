import { useEffect, useRef, useState } from 'react';
import { randomInt } from '../lib/utils';
import { playArcadeTone } from '../lib/sound';

export default function ReactionClickerGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const [phase, setPhase] = useState('waiting');
  const [message, setMessage] = useState('Hold your click until the core appears.');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState({ x: 34, y: 28, size: 78 });
  const timersRef = useRef([]);
  const visibleAtRef = useRef(0);
  const bestReactionRef = useRef(null);
  const finishedRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const roundRef = useRef(0);

  useEffect(() => {
    onScoreChange(0);
  }, [onScoreChange]);

  useEffect(() => {
    scheduleNextRound();

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  function queueTimer(callback, delay) {
    const timer = window.setTimeout(() => {
      if (pauseStateRef?.current) {
        queueTimer(callback, 120);
        return;
      }

      callback();
    }, delay);
    timersRef.current.push(timer);
  }

  function finishGame(reason) {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    setPhase('game-over');
    setMessage(reason);
    playArcadeTone('fail');
    onGameOver({
      score: scoreRef.current,
      session: {
        durationMs: Date.now() - startedAtRef.current,
        roundsCompleted: roundRef.current,
        bestReactionMs: bestReactionRef.current || 0,
      },
    });
  }

  function scheduleNextRound() {
    setPhase('waiting');
    setTarget((current) => ({ ...current, size: Math.max(56, 78 - roundRef.current * 2) }));
    setMessage('Hold...');

    const minimumDelay = Math.max(450, 1100 - roundRef.current * 35);
    const maximumDelay = Math.max(minimumDelay + 150, 1900 - roundRef.current * 45);

    queueTimer(() => {
      const nextTarget = {
        x: randomInt(6, 78),
        y: randomInt(6, 62),
        size: Math.max(52, 78 - roundRef.current * 2),
      };

      visibleAtRef.current = performance.now();
      setTarget(nextTarget);
      setMessage('Click now.');
      setPhase('active');

      const timeoutWindow = Math.max(340, 1200 - roundRef.current * 55);
      queueTimer(() => finishGame('Too slow. The core vanished.'), timeoutWindow);
    }, randomInt(minimumDelay, maximumDelay));
  }

  function handleTargetClick() {
    if (phase !== 'active' || pauseStateRef?.current) {
      return;
    }

    const reactionMs = Math.round(performance.now() - visibleAtRef.current);
    const nextRound = roundRef.current + 1;
    const nextStreak = streakRef.current + 1;
    const points = Math.max(40, 240 - reactionMs) + nextStreak * 6;
    const nextScore = scoreRef.current + points;

    bestReactionRef.current = bestReactionRef.current
      ? Math.min(bestReactionRef.current, reactionMs)
      : reactionMs;
    roundRef.current = nextRound;
    streakRef.current = nextStreak;
    scoreRef.current = nextScore;

    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setRound(nextRound);
    setStreak(nextStreak);
    setScore(nextScore);
    setMessage(`Locked in at ${reactionMs} ms.`);
    onScoreChange(nextScore);
    playArcadeTone('score');
    queueTimer(() => scheduleNextRound(), 280);
  }

  function handleArenaClick() {
    if (pauseStateRef?.current) {
      return;
    }

    if (phase === 'waiting') {
      finishGame('Too early. The trap was still charging.');
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Reaction Clicker</p>
          <p className="mt-2 text-sm text-gray-300">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="score-pill">Round {round}</span>
          <span className="score-pill">Streak {streak}</span>
        </div>
      </div>

      <button
        className="relative mx-auto flex h-[21rem] w-full max-w-[36rem] items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_42%),linear-gradient(180deg,rgba(10,10,10,0.96),rgba(0,0,0,0.98))] p-4 text-left"
        disabled={phase === 'game-over' || pauseStateRef?.current}
        onClick={handleArenaClick}
        type="button"
      >
        <div className="absolute inset-0 bg-neon-grid opacity-20" style={{ backgroundSize: '46px 46px' }} />
        <div className="relative h-full w-full">
          {phase === 'active' ? (
            <button
              className="absolute rounded-full border border-blue-200/30 bg-blue-400/80 transition hover:scale-105"
              onClick={(event) => {
                event.stopPropagation();
                handleTargetClick();
              }}
              style={{
                left: `${target.x}%`,
                top: `${target.y}%`,
                width: `${target.size}px`,
                height: `${target.size}px`,
              }}
              type="button"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <div className="mx-auto h-24 w-24 rounded-full border border-white/10 bg-white/5" />
                <p className="mt-6 text-sm uppercase tracking-[0.35em] text-gray-500">
                  {phase === 'game-over' ? 'Run ended' : 'Stand by'}
                </p>
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
