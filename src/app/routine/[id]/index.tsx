import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AppTextInput,
  Card,
  Field,
  LoadingView,
  PrimaryButton,
  ScreenScroll,
  SecondaryButton,
  SectionTitle,
} from '@/components/ui';
import {
  deleteRoutine,
  getRoutine,
  getRoutineItems,
  moveRoutineItem,
  removeRoutineItem,
  renameRoutine,
  startSession,
  updateRoutineItem,
} from '@/db/repo';
import type { Routine, RoutineExerciseItem } from '@/db/types';
import { parsePositiveInt } from '@/logic/format';
import { colors, spacing } from '@/theme';

export default function RoutineDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const routineId = String(params.id);
  const db = useSQLiteContext();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [items, setItems] = useState<RoutineExerciseItem[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    const [routineData, itemList] = await Promise.all([getRoutine(db, routineId), getRoutineItems(db, routineId)]);
    setRoutine(routineData);
    setItems(itemList);
    setName(routineData?.name ?? '');
    setLoading(false);
  }, [db, routineId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRename() {
    const trimmed = name.trim();
    if (!routine || !trimmed || trimmed === routine.name) {
      setName(routine?.name ?? '');
      return;
    }
    await renameRoutine(db, routine.id, trimmed);
    await load();
  }

  async function handleStart() {
    if (!routine || starting) {
      return;
    }
    if (items.length === 0) {
      Alert.alert('Rutina vacía', 'Añade al menos un ejercicio antes de entrenar.');
      return;
    }
    setStarting(true);
    try {
      const sessionId = await startSession(db, routine.id);
      router.push({ pathname: '/workout/[id]', params: { id: sessionId } });
    } finally {
      setStarting(false);
    }
  }

  async function handleUpdateItem(
    item: RoutineExerciseItem,
    field: 'sets' | 'reps' | 'rest',
    value: string
  ) {
    let targetSets = item.targetSets;
    let targetReps = item.targetReps;
    let restSeconds = item.restSeconds;

    if (field === 'sets') {
      const parsed = parsePositiveInt(value, 20);
      if (parsed === null || parsed < 1) {
        return;
      }
      targetSets = parsed;
    } else if (field === 'rest') {
      const parsed = parsePositiveInt(value, 3600);
      if (parsed === null) {
        return;
      }
      restSeconds = parsed;
    } else {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      targetReps = trimmed;
    }

    await updateRoutineItem(db, item.id, { targetSets, targetReps, restSeconds });
    await load();
  }

  function handleRemoveItem(item: RoutineExerciseItem) {
    Alert.alert('Quitar ejercicio', `¿Quitar «${item.exerciseName}» de la rutina?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          await removeRoutineItem(db, item.id);
          await load();
        },
      },
    ]);
  }

  function handleDeleteRoutine() {
    if (!routine) {
      return;
    }
    Alert.alert('Eliminar rutina', `¿Eliminar la rutina «${routine.name}»? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteRoutine(db, routine.id);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return <LoadingView />;
  }

  if (!routine) {
    return (
      <ScreenScroll>
        <Text style={styles.missing}>La rutina ya no existe.</Text>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <Card>
        <Field label="Nombre de la rutina">
          <AppTextInput value={name} onChangeText={setName} onBlur={handleRename} />
        </Field>
        <PrimaryButton title="Empezar entrenamiento" onPress={handleStart} loading={starting} />
      </Card>

      <SectionTitle>Ejercicios ({items.length})</SectionTitle>

      {items.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            Esta rutina aún no tiene ejercicios. Añade el primero con el botón de abajo.
          </Text>
        </Card>
      ) : null}

      {items.map((item, index) => (
        <Card key={item.id}>
          <View style={styles.itemHeader}>
            <View style={styles.itemTitleWrap}>
              <Text style={styles.itemIndex}>{index + 1}</Text>
              <Text style={styles.itemTitle}>{item.exerciseName}</Text>
            </View>
            <View style={styles.reorderButtons}>
              <SecondaryButton
                title="↑"
                onPress={async () => {
                  await moveRoutineItem(db, item.id, -1);
                  await load();
                }}
                disabled={index === 0}
                style={styles.smallButton}
              />
              <SecondaryButton
                title="↓"
                onPress={async () => {
                  await moveRoutineItem(db, item.id, 1);
                  await load();
                }}
                disabled={index === items.length - 1}
                style={styles.smallButton}
              />
            </View>
          </View>

          {item.instructions ? (
            <Text style={styles.instructions} numberOfLines={3}>
              {item.instructions}
            </Text>
          ) : null}

          <View style={styles.configRow}>
            <View style={styles.configField}>
              <Field label="Series">
                <AppTextInput
                  defaultValue={String(item.targetSets)}
                  keyboardType="number-pad"
                  onEndEditing={(event) => handleUpdateItem(item, 'sets', event.nativeEvent.text)}
                />
              </Field>
            </View>
            <View style={styles.configField}>
              <Field label="Reps">
                <AppTextInput
                  defaultValue={item.targetReps}
                  onEndEditing={(event) => handleUpdateItem(item, 'reps', event.nativeEvent.text)}
                />
              </Field>
            </View>
            <View style={styles.configField}>
              <Field label="Descanso (s)">
                <AppTextInput
                  defaultValue={String(item.restSeconds)}
                  keyboardType="number-pad"
                  onEndEditing={(event) => handleUpdateItem(item, 'rest', event.nativeEvent.text)}
                />
              </Field>
            </View>
          </View>

          <View style={styles.itemActions}>
            <SecondaryButton
              title="Ver ejercicio"
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.exerciseId } })}
              style={styles.flex}
            />
            <SecondaryButton title="Quitar" tone="danger" onPress={() => handleRemoveItem(item)} style={styles.flex} />
          </View>
        </Card>
      ))}

      <PrimaryButton
        title="Añadir ejercicio"
        onPress={() => router.push({ pathname: '/routine/[id]/add-exercise', params: { id: routine.id } })}
      />

      <SectionTitle>Zona peligrosa</SectionTitle>
      <SecondaryButton title="Eliminar rutina" tone="danger" onPress={handleDeleteRoutine} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  missing: {
    color: colors.textDim,
    fontSize: 15,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  itemIndex: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
  },
  itemTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  smallButton: {
    minWidth: 46,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
  },
  instructions: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 18,
  },
  configRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  configField: {
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
});
