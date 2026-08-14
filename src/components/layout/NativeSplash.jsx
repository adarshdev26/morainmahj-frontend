import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A full-screen branded splash that shows briefly on first load,
 * then fades out — mimicking native app launch behavior.
 */
export default function NativeSplash({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: 'hsl(220 40% 20%)' }}
        >
          {/* Logo mark */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center gap-4"
          >
            {/* Diamond tile icon */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: 80, height: 80 }}
            >
              <div
                className="absolute inset-0 rotate-45 rounded-lg border-2"
                style={{ borderColor: 'hsl(43 50% 65%)' }}
              />
              <span
                className="relative font-heading text-5xl font-light"
                style={{ color: 'hsl(43 50% 65%)', fontFamily: 'Cormorant Garamond, serif' }}
              >
                M
              </span>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
              className="text-sm tracking-[0.25em] uppercase"
              style={{ color: 'hsl(43 50% 65%)', fontFamily: 'Inter, sans-serif', fontWeight: 300 }}
            >
              Morain Mahj
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}