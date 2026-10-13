import type { RestState } from '@/db/types';

export const inactiveRest: RestState = { endsAt: null, remainingMs: null, totalSeconds: null };

export function startRest(now: number, seconds: number): RestState {
  return { endsAt: now + seconds * 1000, remainingMs: null, totalSeconds: seconds };
}

export function pauseRest(state: RestState, now: number): RestState {
  const remaining = restRemainingMs(state, now);
  if (remaining === null) {
    return state;
  }
  return { endsAt: null, remainingMs: remaining, totalSeconds: state.totalSeconds };
}

export function resumeRest(state: RestState, now: number): RestState {
  if (state.remainingMs === null) {
    return state;
  }
  return { endsAt: now + state.remainingMs, remainingMs: null, totalSeconds: state.totalSeconds };
}

export function restRemainingMs(state: RestState, now: number): number | null {
  if (state.endsAt !== null) {
    return Math.max(0, state.endsAt - now);
  }
  return state.remainingMs;
}

export function isRestRunning(state: RestState): boolean {
  return state.endsAt !== null;
}

export function isRestPaused(state: RestState): boolean {
  return state.endsAt === null && state.remainingMs !== null;
}

export function isRestActive(state: RestState): boolean {
  return isRestRunning(state) || isRestPaused(state);
}
