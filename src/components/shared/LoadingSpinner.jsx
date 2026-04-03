import { memo } from 'react';

function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-300">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
      <span>{label}</span>
    </div>
  );
}

export default memo(LoadingSpinner);
