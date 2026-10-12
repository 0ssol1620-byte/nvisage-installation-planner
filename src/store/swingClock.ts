import { create } from 'zustand';
import { T_TOP } from '../domain/swing';

/** UI-only swing playback clock (not shared in links). t ∈ [0, 1] over one swing. */
type SwingClock = {
  t: number;
  playing: boolean;
  /** increments on each Play so the ball flight restarts */
  shot: number;
  setT: (t: number) => void;
  play: () => void;
  pause: () => void;
};

export const SWING_SECONDS = 3.4;
export const REST_T = T_TOP;

export const useSwingClock = create<SwingClock>((set) => ({
  t: REST_T,
  playing: false,
  shot: 0,
  setT: (t) => set({ t: Math.min(1, Math.max(0, t)), playing: false }),
  play: () => set((s) => ({ playing: true, t: s.t >= 0.999 || s.t === REST_T ? 0 : s.t, shot: s.shot + 1 })),
  pause: () => set({ playing: false }),
}));

/** Advance the clock; returns true while still playing (caller requests another frame). */
export function tickSwing(dt: number): boolean {
  const s = useSwingClock.getState();
  if (!s.playing) return false;
  const t = s.t + dt / SWING_SECONDS;
  if (t >= 1) {
    useSwingClock.setState({ t: 1, playing: false });
    return false;
  }
  useSwingClock.setState({ t });
  return true;
}
