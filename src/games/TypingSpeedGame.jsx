import { useEffect, useRef, useState } from 'react';
import { playArcadeTone } from '../lib/sound';

const WORD_BANKS = [
  ['dash', 'glow', 'combo', 'laser', 'boost', 'pixel', 'neon', 'score'],
  ['reactor', 'velocity', 'arcade', 'charger', 'flipper', 'orbital', 'streak'],
  ['synchrony', 'afterimage', 'hypershift', 'starfield', 'luminance', 'waveform'],
  ['cybernetic', 'overclocked', 'electroflux', 'transmission', 'interference'],
];

function getWordPool(level) {
  return WORD_BANKS[Math.min(level, WORD_BANKS.length - 1)];
}

function pickWord(level) {
  const pool = getWordPool(level);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function TypingSpeedGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const [timeLeft, setTimeLeft] = useState(45);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [message, setMessage] = useState('Type the prompt and press Enter.');
  const [currentWord, setCurrentWord] = useState(() => pickWord(0));
  const inputRef = useRef(null);
  const finishedRef = useRef(false);
  const charactersTypedRef = useRef(0);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    onScoreChange(0);
    inputRef.current?.focus();
  }, [onScoreChange]);

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
                correctWords,
                charactersTyped: charactersTypedRef.current,
              },
            });
            setMessage('Time up. Reset the run and beat your last chain.');
          }

          return 0;
        }

        return currentTime - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [correctWords, onGameOver, pauseStateRef, score]);

  function handleSubmit(event) {
    event.preventDefault();

    if (timeLeft <= 0 || pauseStateRef?.current) {
      return;
    }

    charactersTypedRef.current += input.length;
    const baseDifficulty = Math.floor(correctWords / 4);

    if (input.trim().toLowerCase() === currentWord.toLowerCase()) {
      const nextCorrectWords = correctWords + 1;
      const nextStreak = streak + 1;
      const points = 20 + nextStreak * 5;
      const nextScore = score + points;
      const upgradedDifficulty = Math.floor(nextCorrectWords / 4);

      setCorrectWords(nextCorrectWords);
      setStreak(nextStreak);
      setScore(nextScore);
      setMessage('Clean input. Keep the combo running.');
      onScoreChange(nextScore);
      playArcadeTone('score');
      setCurrentWord(pickWord(upgradedDifficulty));
    } else {
      setStreak(0);
      setMessage('Mistimed entry. Reset your rhythm.');
      setCurrentWord(pickWord(baseDifficulty));
    }

    setInput('');
  }

  return (
    <div className="flex h-full flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Typing Speed</p>
          <p className="mt-2 text-sm text-gray-300">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="score-pill">{timeLeft}s</span>
          <span className="score-pill">Streak {streak}</span>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Current prompt</p>
        <h3 className="mt-4 text-4xl font-semibold lowercase tracking-wide text-blue-100 sm:text-5xl">
          {currentWord}
        </h3>
      </div>

      <form
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <input
          ref={inputRef}
          autoCapitalize="off"
          autoComplete="off"
          className="input-neon text-base"
          disabled={pauseStateRef?.current || timeLeft <= 0}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type here and press Enter"
          spellCheck={false}
          type="text"
          value={input}
        />

        <button
          className="btn-primary w-full sm:w-fit"
          disabled={pauseStateRef?.current || timeLeft <= 0}
          type="submit"
        >
          Submit Word
        </button>
      </form>
    </div>
  );
}
