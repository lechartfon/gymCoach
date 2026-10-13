import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import {
  AppTextInput,
  Card,
  Field,
  LoadingView,
  PrimaryButton,
  ScreenScroll,
  SectionTitle,
} from '@/components/ui';
import { createExercise, listExercises } from '@/db/repo';
import type { Exercise } from '@/db/types';
import { colors, radius, spacing } from '@/theme';

export default function ExerciseLibraryScreen() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
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

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Falta el nombre', 'Escribe un nombre para el ejercicio.');
      return;
    }
    setSaving(true);
    try {
      await createExercise(db, trimmed, instructions);
      setName('');
      setInstructions('');
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScreenScroll>
      <SectionTitle>Biblioteca ({exercises.length})</SectionTitle>

      {exercises.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Todavía no hay ejercicios. Crea el primero aquí abajo.</Text>
        </Card>
      ) : (
        exercises.map((exercise) => (
          <Pressable
            key={exercise.id}
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
            style={styles.row}
          >
            <Text style={styles.rowTitle}>{exercise.name}</Text>
            {exercise.instructions ? (
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {exercise.instructions}
              </Text>
            ) : null}
          </Pressable>
        ))
      )}

      <SectionTitle>Nuevo ejercicio</SectionTitle>
      <Card>
        <Field label="Nombre">
          <AppTextInput value={name} onChangeText={setName} placeholder="Sentadilla frontal" />
        </Field>
        <Field label="Explicación breve">
          <AppTextInput
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Cómo se realiza el ejercicio…"
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />
        </Field>
        <PrimaryButton title="Crear ejercicio" onPress={handleCreate} loading={saving} />
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textDim,
    fontSize: 13,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
