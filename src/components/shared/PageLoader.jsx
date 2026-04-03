import { memo } from 'react';
import GlassPanel from './GlassPanel';
import LoadingSpinner from './LoadingSpinner';

function PageLoader({ label = 'Loading...' }) {
  return (
    <GlassPanel className="mx-auto max-w-3xl p-8">
      <LoadingSpinner label={label} />
    </GlassPanel>
  );
}

export default memo(PageLoader);
