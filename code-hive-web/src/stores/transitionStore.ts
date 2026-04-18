import { create } from 'zustand';

interface TransitionState {
  warpSpeed: number;
  isTransitioning: boolean;
  startTransition: () => void;
  completeTransition: () => void;
}

export const useTransitionStore = create<TransitionState>((set) => ({
  warpSpeed: 0.0005,
  isTransitioning: false,
  startTransition: () => set({ warpSpeed: 0.008, isTransitioning: true }),
  completeTransition: () => set({ warpSpeed: 0.0005, isTransitioning: false }),
}));