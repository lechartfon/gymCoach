import { inactiveRest, pauseRest, resumeRest, restRemainingMs, startRest } from '../rest';

describe('estado del descanso', () => {
  it('inactivo no tiene tiempo restante', () => {
    expect(restRemainingMs(inactiveRest, 1000)).toBeNull();
  });

  it('al iniciar guarda la marca de fin', () => {
    const state = startRest(1000, 90);
    expect(state.endsAt).toBe(91_000);
    expect(state.remainingMs).toBeNull();
    expect(state.totalSeconds).toBe(90);
    expect(restRemainingMs(state, 1000)).toBe(90_000);
  });

  it('el restante se calcula con el reloj, aunque la app estuviera en segundo plano', () => {
    const state = startRest(1000, 90);
    expect(restRemainingMs(state, 61_000)).toBe(30_000);
    expect(restRemainingMs(state, 500_000)).toBe(0);
  });

  it('pausar conserva el restante y reanudar lo mantiene', () => {
    const started = startRest(1000, 90);
    const paused = pauseRest(started, 31_000);
    expect(paused.endsAt).toBeNull();
    expect(paused.remainingMs).toBe(60_000);
    expect(restRemainingMs(paused, 999_999)).toBe(60_000);

    const resumed = resumeRest(paused, 999_999);
    expect(resumed.endsAt).toBe(1_059_999);
    expect(restRemainingMs(resumed, 999_999)).toBe(60_000);
  });

  it('pausar un descanso inactivo no cambia nada', () => {
    expect(pauseRest(inactiveRest, 1000)).toEqual(inactiveRest);
  });
});
