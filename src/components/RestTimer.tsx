import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import type { RestState } from '@/db/types';
import { formatClock } from '@/logic/format';
import { isRestPaused, isRestRunning, restRemainingMs } from '@/logic/rest';
import { colors, radius, spacing } from '@/theme';

import { PrimaryButton, SecondaryButton } from './ui';

type Props = {
  rest: RestState;
  defaultSeconds: number;
  finished: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onExpire: () => void;
};

/**
 * Cuenta atrás del descanso. No muestra notificaciones: si la app pasa a
 * segundo plano, el tiempo se recalcula a partir de la marca de fin guardada,
 * de modo que al volver el contador sigue siendo correcto.
 */
export function RestTimer({ rest, defaultSeconds, finished, onStart, onPause, onResume, onSkip, onExpire }: Props) {
  const [now, setNow] = useState(0);
  const expiredRef = useRef(false);

  const running = isRestRunning(rest);
  const paused = isRestPaused(rest);

  const rawRemaining = restRemainingMs(rest, now);
  const totalMs = rest.totalSeconds !== null ? rest.totalSeconds * 1000 : null;
  const remaining =
    rawRemaining === null ? null : totalMs !== null ? Math.min(rawRemaining, totalMs) : rawRemaining;

  useEffect(() => {
    if (!running) {
      return;
    }
    const update = () => setNow(Date.now());
    const timeout = setTimeout(update, 0);
    const interval = setInterval(update, 500);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        update();
      }
    });
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      subscription.remove();
    };
  }, [running, rest]);

  useEffect(() => {
    if (!running) {
      expiredRef.current = false;
      return;
    }
    if (remaining !== null && remaining <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire();
    }
  }, [running, remaining, onExpire]);

  if (running && remaining !== null) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Descanso</Text>
        <Text style={styles.clock}>{formatClock(remaining)}</Text>
        <View style={styles.actions}>
          <SecondaryButton title="Pausar" onPress={onPause} style={styles.action} />
          <SecondaryButton title="Saltar" onPress={onSkip} style={styles.action} />
        </View>
      </View>
    );
  }

  if (paused && remaining !== null) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Descanso en pausa</Text>
        <Text style={styles.clock}>{formatClock(remaining)}</Text>
        <View style={styles.actions}>
          <SecondaryButton title="Reanudar" onPress={onResume} style={styles.action} />
          <SecondaryButton title="Saltar" onPress={onSkip} style={styles.action} />
        </View>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={[styles.card, styles.finishedCard]}>
        <Text style={styles.finishedText}>Descanso completado</Text>
      </View>
    );
  }

  if (defaultSeconds <= 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Descanso configurado: {defaultSeconds} s</Text>
      <PrimaryButton title={`Iniciar descanso (${defaultSeconds} s)`} onPress={onStart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  label: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  clock: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  action: {
    flex: 1,
  },
  finishedCard: {
    backgroundColor: colors.card,
  },
  finishedText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
