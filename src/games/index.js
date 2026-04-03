import { lazy } from 'react';

// Lazy chunks keep the dashboard lean and only load a cabinet when it is opened.
const BrickBreakerGame = lazy(() => import('./BrickBreakerGame'));
const EndlessRunnerGame = lazy(() => import('./EndlessRunnerGame'));
const FlappyGame = lazy(() => import('./FlappyGame'));
const MemoryFlipGame = lazy(() => import('./MemoryFlipGame'));
const ReactionClickerGame = lazy(() => import('./ReactionClickerGame'));
const SnakeGame = lazy(() => import('./SnakeGame'));
const SpaceShooterGame = lazy(() => import('./SpaceShooterGame'));
const TypingSpeedGame = lazy(() => import('./TypingSpeedGame'));

export const GAME_COMPONENTS = {
  snake: SnakeGame,
  flappy: FlappyGame,
  'space-shooter': SpaceShooterGame,
  'brick-breaker': BrickBreakerGame,
  'reaction-clicker': ReactionClickerGame,
  'endless-runner': EndlessRunnerGame,
  'memory-flip': MemoryFlipGame,
  'typing-speed': TypingSpeedGame,
};
