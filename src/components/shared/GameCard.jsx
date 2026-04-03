import { memo } from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import Card from './Card';

function GameCard({ game, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.32, delay: index * 0.04 }}
    >
      <Card
        className="h-full p-6"
        interactive
        strong
      >
        <div className="flex h-full flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-label">{game.badge}</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{game.name}</h3>
            </div>
            <span className="score-pill">{game.scoring}</span>
          </div>

          <p className="max-w-sm text-sm leading-6 text-gray-300">{game.description}</p>

          <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-gray-300">
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1">
              {game.controls}
            </span>
          </div>

          <Button
            className="mt-2 w-full sm:w-fit"
            size="lg"
            to={`/games/${game.id}`}
          >
            Play Game
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

export default memo(GameCard);
