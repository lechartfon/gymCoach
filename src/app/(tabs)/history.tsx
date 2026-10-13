import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, LoadingView, ScreenScroll, SectionTitle } from '@/components/ui';
import { listCompletedSessions } from '@/db/repo';
import type { SessionSummary } from '@/db/types';
import { formatDate, formatDurationMs } from '@/logic/format';
import { colors, radius, spacing } from '@/theme';

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await listCompletedSessions(db);
    setSessions(list);
    setLoading(false);
  }, [db]);

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
      <SectionTitle>Entrenamientos completados</SectionTitle>

      {sessions.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            Todavía no has completado ningún entrenamiento. Cuando termines uno, aparecerá aquí con sus pesos y notas.
          </Text>
        </Card>
      ) : (
        sessions.map((session) => (
          <Pressable
            key={session.id}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
            style={styles.row}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>Rutina {session.routineName}</Text>
              <Text style={styles.rowDate}>{formatDate(session.completedAt ?? session.startedAt)}</Text>
            </View>
            <Text style={styles.rowMeta}>
              {session.exerciseCount} {session.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
              {session.setCount} {session.setCount === 1 ? 'serie' : 'series'}
              {session.completedAt ? ` · ${formatDurationMs(session.completedAt - session.startedAt)}` : ''}
            </Text>
          </Pressable>
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
  row: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  rowDate: {
    color: colors.textDim,
    fontSize: 13,
  },
  rowMeta: {
    color: colors.textDim,
    fontSize: 13,
  },
});
