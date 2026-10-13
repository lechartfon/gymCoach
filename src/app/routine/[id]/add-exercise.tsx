import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

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
import { addExerciseToRoutine, createExercise, listExercises } from '@/db/repo';
import type { Exercise } from '@/db/types';
import { parsePositiveInt } from '@/logic/format';
import { colors, radius, spacing } from '@/theme';

export default function AddExerciseScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const routineId = String(params.id);
  const db = useSQLiteContext();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Exercise | null>(null);

  const [newName, setNewName] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [rest, setRest] = useState('90');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const list = await listExercises(db);
    setExercises(list);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return exercises;
    }
    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(term));
  }, [exercises, search]);

  function readConfig(): { targetSets: number; targetReps: string; restSeconds: number } | null {
    const parsedSets = parsePositiveInt(sets, 20) ?? 0;
    const parsedRest = parsePositiveInt(rest, 3600);
    const trimmedReps = reps.trim();
    if (parsedSets < 1 || parsedRest === null || !trimmedReps) {
      Alert.alert('Datos inválidos', 'Revisa las series, repeticiones y el descanso.');
      return null;
    }
    return { targetSets: parsedSets, targetReps: trimmedReps, restSeconds: parsedRest };
  }

  async function handleAddSelected() {
    if (!selected) {
      return;
    }
    const config = readConfig();
    if (!config) {
      return;
    }
    setSaving(true);
    try {
      await addExerciseToRoutine(db, routineId, selected.id, config);
      router.back();
    } catch (error) {
      Alert.alert('No se pudo añadir', error instanceof Error ? error.message : 'Error inesperado');
      setSaving(false);
    }
  }

  async function handleCreateAndAdd() {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      Alert.alert('Falta el nombre', 'Escribe un nombre para el ejercicio nuevo.');
      return;
    }
    const config = readConfig();
    if (!config) {
      return;
    }
    setSaving(true);
    try {
      const exercise = await createExercise(db, trimmedName, newInstructions);
      await addExerciseToRoutine(db, routineId, exercise.id, config);
      router.back();
    } catch (error) {
      Alert.alert('No se pudo crear', error instanceof Error ? error.message : 'Error inesperado');
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScreenScroll>
      <SectionTitle>1. Elige un ejercicio</SectionTitle>
      <AppTextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre…"
        returnKeyType="search"
      />

      {filtered.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            No hay resultados. Puedes crear el ejercicio más abajo y se añadirá directamente.
          </Text>
        </Card>
      ) : (
        filtered.map((exercise) => {
          const isSelected = selected?.id === exercise.id;
          return (
            <Pressable
              key={exercise.id}
              onPress={() => setSelected(exercise)}
              style={[styles.exerciseRow, isSelected && styles.exerciseRowSelected]}
            >
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              {exercise.instructions ? (
                <Text style={styles.exerciseInstructions} numberOfLines={1}>
                  {exercise.instructions}
                </Text>
              ) : null}
            </Pressable>
          );
        })
      )}

      <SectionTitle>2. Configura el ejercicio</SectionTitle>
      <Card>
        <Text style={styles.selectedText}>
          {selected ? `Seleccionado: ${selected.name}` : 'Todavía no has seleccionado ningún ejercicio.'}
        </Text>
        <View style={styles.configRow}>
          <View style={styles.configField}>
            <Field label="Series">
              <AppTextInput value={sets} onChangeText={setSets} keyboardType="number-pad" />
            </Field>
          </View>
          <View style={styles.configField}>
            <Field label="Reps">
              <AppTextInput value={reps} onChangeText={setReps} />
            </Field>
          </View>
          <View style={styles.configField}>
            <Field label="Descanso (s)">
              <AppTextInput value={rest} onChangeText={setRest} keyboardType="number-pad" />
            </Field>
          </View>
        </View>
        <PrimaryButton
          title="Añadir a la rutina"
          onPress={handleAddSelected}
          disabled={!selected}
          loading={saving}
        />
      </Card>

      <SectionTitle>¿No encuentras el ejercicio?</SectionTitle>
      <Card>
        <Field label="Nombre">
          <AppTextInput value={newName} onChangeText={setNewName} placeholder="Press inclinado con mancuernas" />
        </Field>
        <Field label="Explicación breve" hint="Se mostrará durante el entrenamiento.">
          <AppTextInput
            value={newInstructions}
            onChangeText={setNewInstructions}
            placeholder="Cómo se realiza el ejercicio…"
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />
        </Field>
        <SecondaryButton title="Crear y añadir" onPress={handleCreateAndAdd} disabled={saving} />
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  exerciseRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  exerciseRowSelected: {
    borderColor: colors.accent,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseInstructions: {
    color: colors.textDim,
    fontSize: 13,
  },
  selectedText: {
    color: colors.textDim,
    fontSize: 14,
  },
  configRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  configField: {
    flex: 1,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
