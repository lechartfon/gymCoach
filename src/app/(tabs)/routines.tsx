import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, LoadingView, PrimaryButton, ScreenScroll, SecondaryButton } from '@/components/ui';
import { getRoutineItemCounts, listRoutines, startSession } from '@/db/repo';
import type { Routine } from '@/db/types';
import { colors, spacing } from '@/theme';

export default function RoutinesScreen() {
  const db = useSQLiteContext();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [routineList, itemCounts] = await Promise.all([listRoutines(db), getRoutineItemCounts(db)]);
    setRoutines(routineList);
    setCounts(itemCounts);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleStart(routineId: string) {
    if (startingId) {
      return;
    }
    setStartingId(routineId);
    try {
      const sessionId = await startSession(db, routineId);
      router.push({ pathname: '/workout/[id]', params: { id: sessionId } });
    } finally {
      setStartingId(null);
    }
  }

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScreenScroll>
      {routines.length === 0 ? (
        <EmptyState
          title="Sin rutinas todavía"
          message="Crea una rutina y añade ejercicios con sus series, repeticiones, descanso e instrucciones."
        >
          <PrimaryButton title="Nueva rutina" onPress={() => router.push('/routine/new')} />
        </EmptyState>
      ) : (
        routines.map((routine) => {
          const total = counts[routine.id] ?? 0;
          return (
            <Card key={routine.id}>
              <Text style={styles.title}>Rutina {routine.name}</Text>
              <Text style={styles.meta}>
                {total} {total === 1 ? 'ejercicio' : 'ejercicios'}
              </Text>
              <View style={styles.actions}>
                <PrimaryButton
                  title={startingId === routine.id ? '' : 'Entrenar'}
                  onPress={() => handleStart(routine.id)}
                  loading={startingId === routine.id}
                  disabled={startingId !== null && startingId !== routine.id}
                  style={styles.action}
                />
                <SecondaryButton
                  title="Editar"
                  onPress={() => router.push({ pathname: '/routine/[id]', params: { id: routine.id } })}
                  style={styles.action}
                />
              </View>
            </Card>
          );
        })
      )}

      {routines.length > 0 ? (
        <PrimaryButton title="Nueva rutina" onPress={() => router.push('/routine/new')} />
      ) : null}

      {startingId ? (
        <View style={styles.hintRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.hint}>Preparando entrenamiento…</Text>
        </View>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  meta: {
    color: colors.textDim,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  action: {
    flex: 1,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  hint: {
    color: colors.textDim,
    fontSize: 13,
  },
});
