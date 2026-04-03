import { useEffect, useRef, useState } from 'react';
import { playArcadeTone } from '../lib/sound';

export default function WhackMoleGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const [activeIndex, setActiveIndex] = useState(4);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [message, setMessage] = useState('Smash the glitch cores as fast as they surface.');
  const activeIndexRef = useRef(4);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const finishedRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const timersRef = useRef([]);

  function queueTimer(callback, delay) {
    const timer = window.setTimeout(() => {
      if (pauseStateRef?.current) {
        queueTimer(callback, 120);
        return;
      }

      callback();
    }, delay);

    timersRef.current.push(timer);
    return timer;
  }

  useEffect(() => {
    onScoreChange(0);
  }, [onScoreChange]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    },
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (pauseStateRef?.current) {
        return;
      }

      setTimeLeft((currentTime) => {
        if (currentTime <= 1) {
          if (!finishedRef.current) {
            finishedRef.current = true;
            playArcadeTone('fail');
            onGameOver({
              score,
              session: {
                durationMs: Date.now() - startedAtRef.current,
                hits: hitsRef.current,
                misses: missesRef.current,
              },
            });
            setMessage('Time called. Hit Play Again to restart the grid.');
          }

          return 0;
        }

        return currentTime - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onGameOver, pauseStateRef, score]);

  useEffect(() => {
    if (timeLeft <= 0) {
      return () => {};
    }

    const delay = Math.max(260, 1000 - hitsRef.current * 26);
    const timer = queueTimer(() => {
      if (activeIndexRef.current !== -1) {
        missesRef.current += 1;
      }

      let nextIndex = Math.floor(Math.random() * 9);
      while (nextIndex === activeIndexRef.current) {
        nextIndex = Math.floor(Math.random() * 9);
      }

      setActiveIndex(nextIndex);
      setCycle((currentCycle) => currentCycle + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [cycle, pauseStateRef, timeLeft]);

  function handleHoleClick(index) {
    if (timeLeft <= 0 || pauseStateRef?.current) {
      return;
    }

    if (index === activeIndex) {
      const nextCombo = combo + 1;
      const points = 10 + nextCombo * 2;
      const nextScore = score + points;

      hitsRef.current += 1;
      setCombo(nextCombo);
      setScore(nextScore);
      setActiveIndex(-1);
      setCycle((currentCycle) => currentCycle + 1);
      setMessage('Direct hit. The grid is accelerating.');
      onScoreChange(nextScore);
      playArcadeTone('score');
      return;
    }

    setCombo(0);
    setMessage('Missed shot. Recenter and keep moving.');
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Whack-a-Mole</p>
          <p className="mt-2 text-sm text-gray-300">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="score-pill">{timeLeft}s</span>
          <span className="score-pill">Combo {combo}</span>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[30rem] grid-cols-3 gap-4">
        {Array.from({ length: 9 }, (_, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={`hole-${index}`}
              className={`aspect-square rounded-[1.8rem] border transition ${
                isActive
                  ? 'border-brand/40 bg-brand/15 shadow-neon'
                  : 'border-white/10 bg-white/5 hover:border-brand/30 hover:bg-brand/10'
              }`}
              disabled={pauseStateRef?.current || timeLeft <= 0}
              onClick={() => handleHoleClick(index)}
              type="button"
            >
              <div className="flex h-full items-center justify-center">
                <div
                  className={`rounded-full transition ${
                    isActive
                      ? 'h-20 w-20 bg-blue-400'
                      : 'h-12 w-12 bg-white/10'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
