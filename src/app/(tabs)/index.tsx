import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, SecondaryButton, SectionTitle } from '@/components/ui';
import {
  deleteSession,
  getActiveSession,
  getLastCompletedRoutineId,
  getRoutineItemCounts,
  listRoutines,
  seedSampleData,
  startSession,
} from '@/db/repo';
import type { Routine, WorkoutSession } from '@/db/types';
import { nextSuggestion } from '@/logic/suggestion';
import { colors, radius, spacing } from '@/theme';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [lastRoutineId, setLastRoutineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    const [routineList, active, last, itemCounts] = await Promise.all([
      listRoutines(db),
      getActiveSession(db),
      getLastCompletedRoutineId(db),
      getRoutineItemCounts(db),
    ]);
    setRoutines(routineList);
    setActiveSession(active);
    setLastRoutineId(last);
    setCounts(itemCounts);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const suggestion = nextSuggestion(routines, lastRoutineId);
  const otherRoutines = routines.filter((routine) => routine.id !== suggestion?.id);

  async function handleStart(routineId: string) {
    if (starting) {
      return;
    }
    setStarting(true);
    try {
      const sessionId = await startSession(db, routineId);
      router.push({ pathname: '/workout/[id]', params: { id: sessionId } });
    } catch (error) {
      Alert.alert('No se pudo empezar', error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setStarting(false);
    }
  }

  function handleDiscard(sessionId: string) {
    Alert.alert('Descartar entrenamiento', '¿Seguro que quieres descartar el entrenamiento en curso? Se perderán los datos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(db, sessionId);
          await load();
        },
      },
    ]);
  }

  async function handleSeed() {
    await seedSampleData(db);
    await load();
  }

  if (loading) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {activeSession ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeEyebrow}>Entrenamiento en curso</Text>
          <Text style={styles.activeTitle}>{activeSession.routineName}</Text>
          <PrimaryButton
            title="Reanudar"
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: activeSession.id } })}
          />
          <SecondaryButton title="Descartar" tone="danger" onPress={() => handleDiscard(activeSession.id)} />
        </View>
      ) : null}

      {routines.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aún no tienes rutinas</Text>
          <Text style={styles.emptyMessage}>
            Crea tu primera rutina o carga un ejemplo con las rutinas A, B, C y D para empezar rápido.
          </Text>
          <PrimaryButton title="Crear rutina" onPress={() => router.push('/routine/new')} />
          <SecondaryButton title="Cargar rutinas de ejemplo" onPress={handleSeed} />
        </View>
      ) : null}

      {!activeSession && suggestion ? (
        <View style={styles.suggestionCard}>
          <Text style={styles.suggestionEyebrow}>Siguiente rutina sugerida</Text>
          <Text style={styles.suggestionTitle}>Rutina {suggestion.name}</Text>
          <Text style={styles.suggestionMeta}>
            {counts[suggestion.id] ?? 0} {(counts[suggestion.id] ?? 0) === 1 ? 'ejercicio' : 'ejercicios'}
          </Text>
          <PrimaryButton title="Empezar entrenamiento" onPress={() => handleStart(suggestion.id)} loading={starting} />
        </View>
      ) : null}

      {!activeSession && otherRoutines.length > 0 ? (
        <>
          <SectionTitle>Empezar otra rutina</SectionTitle>
          {otherRoutines.map((routine) => (
            <SecondaryButton
              key={routine.id}
              title={`Rutina ${routine.name} · ${counts[routine.id] ?? 0} ejercicios`}
              onPress={() => handleStart(routine.id)}
              disabled={starting}
            />
          ))}
        </>
      ) : null}

      {!loading && routines.length > 0 ? (
        <>
          <SectionTitle>Gestión</SectionTitle>
          <View style={styles.manageRow}>
            <SecondaryButton title="Rutinas" onPress={() => router.push('/routines')} style={styles.manageButton} />
            <SecondaryButton title="Ejercicios" onPress={() => router.push('/exercise')} style={styles.manageButton} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  activeCard: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  activeEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activeTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyMessage: {
    color: colors.textDim,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  suggestionCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  suggestionEyebrow: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  suggestionTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  suggestionMeta: {
    color: colors.textDim,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  manageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manageButton: {
    flex: 1,
  },
});
