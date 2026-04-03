import { memo } from 'react';

function ArcadeBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#000000_0%,#050505_100%)]" />
      <div className="absolute inset-0 bg-neon-grid opacity-10" style={{ backgroundSize: '96px 96px' }} />
      <div className="absolute left-0 top-0 h-80 w-80 bg-[radial-gradient(circle,rgba(59,130,246,0.12),transparent_72%)]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 bg-[radial-gradient(circle,rgba(255,255,255,0.04),transparent_75%)]" />
    </div>
  );
}

export default memo(ArcadeBackground);
