import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useTransitionStore } from '../stores/transitionStore';

interface Props {
  children: ReactNode;
}

export default function PageTransition({ children }: Props) {
  const { startTransition, completeTransition } = useTransitionStore();

  // Dispara warp na entrada de cada página
  useEffect(() => {
    startTransition();
    const timer = setTimeout(completeTransition, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: '100%', minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  );
}