import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

function Card({
  children,
  className = '',
  interactive = false,
  strong = false,
}) {
  const sharedClassName = cn(
    strong ? 'glass-panel-strong' : 'glass-panel',
    interactive && 'transition-transform duration-150 hover:-translate-y-1',
    className,
  );

  if (interactive) {
    return (
      <motion.div
        className={sharedClassName}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        whileHover={{ y: -4 }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={sharedClassName}>{children}</div>;
}

export default memo(Card);
