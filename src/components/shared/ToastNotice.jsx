import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const TOAST_STYLES = {
  info: 'border-brand/30 bg-black/90 text-blue-100',
  success: 'border-success/30 bg-black/90 text-green-100',
  error: 'border-danger/30 bg-black/90 text-red-100',
};

function ToastNotice({ notice }) {
  return (
    <AnimatePresence>
      {notice ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-6 right-4 z-40 max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-panel sm:right-6 ${
            TOAST_STYLES[notice.kind] || TOAST_STYLES.info
          }`}
          exit={{ opacity: 0, y: 12 }}
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
        >
          {notice.message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default memo(ToastNotice);
