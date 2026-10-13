import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, LoadingView, ScreenScroll, SectionTitle } from '@/components/ui';
import { getExercise, getExerciseHistory } from '@/db/repo';
import type { Exercise, ExerciseHistoryEntry } from '@/db/types';
import { formatDate, formatWeight } from '@/logic/format';
import { colors, spacing } from '@/theme';

export default function ExerciseProgressScreen() {
  const params = useLocalSearchParams<{ exerciseId: string }>();
  const exerciseId = String(params.exerciseId);
  const db = useSQLiteContext();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [data, entries] = await Promise.all([getExercise(db, exerciseId), getExerciseHistory(db, exerciseId)]);
    setExercise(data);
    setHistory(entries);
    setLoading(false);
  }, [db, exerciseId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScreenScroll>
      <SectionTitle>Progreso de {exercise?.name ?? 'ejercicio'}</SectionTitle>

      {history.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            Todavía no hay registros para este ejercicio. Cuando entrenes y guardes pesos, aparecerán aquí.
          </Text>
        </Card>
      ) : (
        history.map((entry) => (
          <Card key={entry.sessionId}>
            <Text style={styles.date}>{formatDate(entry.date)}</Text>
            <Text style={styles.routine}>Rutina {entry.routineName}</Text>
            <View style={styles.setsRow}>
              {entry.sets.length === 0 ? (
                <Text style={styles.noSets}>Sin series registradas</Text>
              ) : (
                entry.sets.map((set) => (
                  <View key={set.setIndex} style={styles.setPill}>
                    <Text style={styles.setText}>
                      S{set.setIndex}: {formatWeight(set.weightKg)} kg
                    </Text>
                  </View>
                ))
              )}
            </View>
            {entry.note ? <Text style={styles.note}>“{entry.note}”</Text> : null}
          </Card>
        ))
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  date: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  routine: {
    color: colors.textDim,
    fontSize: 13,
  },
  setsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
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
  noSets: {
    color: colors.textDim,
    fontSize: 13,
  },
  note: {
    color: colors.textDim,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
