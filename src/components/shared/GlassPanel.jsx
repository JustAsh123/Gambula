import { memo } from 'react';
import Card from './Card';

function GlassPanel({ children, className = '', strong = false }) {
  return <Card className={className} strong={strong}>{children}</Card>;
}

export default memo(GlassPanel);
