import { useEffect, useRef, useState } from 'react';
import { playArcadeTone } from '../lib/sound';
import { shuffleArray } from '../lib/utils';

const MEMORY_SYMBOLS = [
  'A1',
  'B2',
  'C3',
  'D4',
  'E5',
  'F6',
  'G7',
  'H8',
  'J9',
  'K0',
  'L1',
  'M2',
];

function createDeck(level) {
  const pairCount = Math.min(5 + level, 10);
  const values = MEMORY_SYMBOLS.slice(0, pairCount);

  return shuffleArray(
    values.flatMap((value, index) => [
      { id: `${value}-${index}-a`, value, matched: false, revealed: true },
      { id: `${value}-${index}-b`, value, matched: false, revealed: true },
    ]),
  );
}

export default function MemoryFlipGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState(() => createDeck(1));
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(true);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(36);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState('Memorize the layout before the glow fades.');
  const timersRef = useRef([]);
  const matchedPairsRef = useRef(0);
  const levelsClearedRef = useRef(0);
  const movesRef = useRef(0);
  const finishedRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const scoreRef = useRef(0);

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
    setCards(createDeck(level));
    setSelectedIds([]);
    setBusy(true);
    setMessage(`Level ${level}: scan the board.`);

    const previewTimer = queueTimer(() => {
      setCards((currentCards) => currentCards.map((card) => ({ ...card, revealed: false })));
      setBusy(false);
      setMessage('Find every pair before the timer burns out.');
    }, 1100);

    return () => {
      window.clearTimeout(previewTimer);
    };
  }, [level]);

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
              score: scoreRef.current,
              session: {
                durationMs: Date.now() - startedAtRef.current,
                matchedPairs: matchedPairsRef.current,
                levelsCleared: levelsClearedRef.current,
                moves: movesRef.current,
              },
            });
            setMessage('Clock expired. Shuffle up and try again.');
          }

          return 0;
        }

        return currentTime - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [onGameOver, pauseStateRef]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timeout) => window.clearTimeout(timeout));
      timersRef.current = [];
    },
    [],
  );

  function handleCardClick(cardId) {
    if (busy || timeLeft <= 0 || pauseStateRef?.current) {
      return;
    }

    const clickedCard = cards.find((card) => card.id === cardId);

    if (!clickedCard || clickedCard.revealed || clickedCard.matched || selectedIds.length === 2) {
      return;
    }

    const revealedCards = cards.map((card) =>
      card.id === cardId ? { ...card, revealed: true } : card,
    );
    const nextSelectedIds = [...selectedIds, cardId];

    setCards(revealedCards);
    setSelectedIds(nextSelectedIds);
    movesRef.current += 1;

    if (nextSelectedIds.length !== 2) {
      return;
    }

    setBusy(true);
    const [firstCard, secondCard] = nextSelectedIds.map((selectedId) =>
      revealedCards.find((card) => card.id === selectedId),
    );

    if (firstCard.value === secondCard.value) {
      const nextStreak = streak + 1;
      const points = 80 + nextStreak * 20;
      const nextScore = score + points;

      matchedPairsRef.current += 1;
      scoreRef.current = nextScore;
      setScore(nextScore);
      setStreak(nextStreak);
      onScoreChange(nextScore);
      playArcadeTone('score');

      queueTimer(() => {
        const matchedDeck = revealedCards.map((card) =>
          nextSelectedIds.includes(card.id) ? { ...card, matched: true } : card,
        );

        setCards(matchedDeck);
        setSelectedIds([]);
        setBusy(false);

        if (matchedDeck.every((card) => card.matched)) {
          levelsClearedRef.current += 1;
          setTimeLeft((currentTime) => currentTime + 8);
          setMessage('Deck cleared. New layout incoming.');
          setLevel((currentLevel) => currentLevel + 1);
        }
      }, 380);
      return;
    }

    setStreak(0);
    setMessage('Mismatch. Reset your pattern read.');

    queueTimer(() => {
      setCards((currentCards) =>
        currentCards.map((card) =>
          nextSelectedIds.includes(card.id) ? { ...card, revealed: false } : card,
        ),
      );
      setSelectedIds([]);
      setBusy(false);
    }, 700);
  }

  const columnCount = cards.length >= 18 ? 5 : 4;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Memory Flip</p>
          <p className="mt-2 text-sm text-gray-300">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="score-pill">Level {level}</span>
          <span className="score-pill">{timeLeft}s left</span>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => (
          <button
            key={card.id}
            className={`aspect-square rounded-[1.45rem] border text-sm font-semibold transition ${
              card.matched
                ? 'border-success/35 bg-success/15 text-green-100 shadow-neon'
                : card.revealed
                  ? 'border-brand/40 bg-brand/15 text-blue-100 shadow-neon'
                  : 'border-white/10 bg-white/5 text-gray-500 hover:border-brand/30 hover:bg-brand/10'
            }`}
            disabled={pauseStateRef?.current || timeLeft <= 0}
            onClick={() => handleCardClick(card.id)}
            type="button"
          >
            <span className="block text-lg">{card.revealed || card.matched ? card.value : '??'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
