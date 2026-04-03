import clsx from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function shuffleArray(items) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function formatScore(value) {
  return new Intl.NumberFormat('en-US').format(
    Math.max(0, Math.floor(Number(value) || 0)),
  );
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.max(0, Number(value) || 0));
}

export function formatDate(value) {
  if (!value) {
    return 'Now';
  }

  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Now';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getInitials(name) {
  if (!name) {
    return 'AR';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function getLocalBestScore(gameId) {
  if (typeof window === 'undefined') {
    return 0;
  }

  return Number(localStorage.getItem(`gambula-best:${gameId}`) || 0);
}

export function saveLocalBestScore(gameId, score) {
  if (typeof window === 'undefined') {
    return;
  }

  const previous = getLocalBestScore(gameId);

  if (score > previous) {
    localStorage.setItem(`gambula-best:${gameId}`, String(score));
  }
}
