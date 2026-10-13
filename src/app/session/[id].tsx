import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Card, LoadingView, PrimaryButton, ScreenScroll, SecondaryButton, SectionTitle } from '@/components/ui';
import { deleteSession, getSessionDetail } from '@/db/repo';
import type { SessionDetail } from '@/db/types';
import { formatDate, formatDurationMs, formatWeight } from '@/logic/format';
import { colors, spacing } from '@/theme';

export default function SessionSummaryScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const sessionId = String(params.id);
  const db = useSQLiteContext();

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getSessionDetail(db, sessionId);
    setDetail(data);
    setLoading(false);
  }, [db, sessionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function handleDelete() {
    Alert.alert('Eliminar registro', '¿Eliminar este entrenamiento del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(db, sessionId);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return <LoadingView />;
  }

  if (!detail) {
    return (
      <ScreenScroll>
        <Card>
          <Text style={styles.dim}>Este entrenamiento ya no existe.</Text>
        </Card>
      </ScreenScroll>
    );
  }

  const { session, exercises } = detail;
  const totalLogged = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const duration = session.completedAt ? formatDurationMs(session.completedAt - session.startedAt) : null;

  return (
    <ScreenScroll>
      <Card>
        <Text style={styles.routine}>Rutina {session.routineName}</Text>
        <Text style={styles.date}>{formatDate(session.completedAt ?? session.startedAt)}</Text>
        <Text style={styles.dim}>
          {totalLogged} {totalLogged === 1 ? 'serie registrada' : 'series registradas'}
          {duration ? ` · ${duration}` : ''}
        </Text>
        {session.status === 'active' ? (
          <PrimaryButton
            title="Reanudar entrenamiento"
            onPress={() => router.replace({ pathname: '/workout/[id]', params: { id: sessionId } })}
          />
        ) : null}
      </Card>

      <SectionTitle>Ejercicios</SectionTitle>
      {exercises.map((exercise) => (
        <Card key={exercise.id}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
            <Text style={styles.dim}>
              {exercise.sets.length}/{exercise.targetSets} series
            </Text>
          </View>
          <View style={styles.setRow}>
            {exercise.sets.length === 0 ? (
              <Text style={styles.dim}>Sin series registradas</Text>
            ) : (
              exercise.sets.map((set) => (
                <View key={set.id} style={styles.setPill}>
                  <Text style={styles.setText}>
                    S{set.setIndex}: {formatWeight(set.weightKg)} kg
                  </Text>
                </View>
              ))
            )}
          </View>
          {exercise.note ? <Text style={styles.note}>“{exercise.note}”</Text> : null}
        </Card>
      ))}

      <SectionTitle>Acciones</SectionTitle>
      <SecondaryButton title="Eliminar registro" tone="danger" onPress={handleDelete} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  routine: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  date: {
    color: colors.text,
    fontSize: 15,
  },
  dim: {
    color: colors.textDim,
    fontSize: 14,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  setRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  setPill: {
    backgroundColor: colors.cardAlt,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  setText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  note: {
    color: colors.textDim,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
