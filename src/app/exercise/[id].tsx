import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

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
import { deleteExercise, getExercise, updateExercise } from '@/db/repo';
import type { Exercise } from '@/db/types';
import { colors } from '@/theme';

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const exerciseId = String(params.id);
  const db = useSQLiteContext();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getExercise(db, exerciseId);
    setExercise(data);
    setName(data?.name ?? '');
    setInstructions(data?.instructions ?? '');
    setLoading(false);
  }, [db, exerciseId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Falta el nombre', 'El ejercicio necesita un nombre.');
      return;
    }
    setSaving(true);
    try {
      await updateExercise(db, exerciseId, trimmed, instructions);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!exercise) {
      return;
    }
    Alert.alert('Eliminar ejercicio', `¿Eliminar «${exercise.name}»? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExercise(db, exerciseId);
            router.back();
          } catch {
            Alert.alert(
              'No se puede eliminar',
              'Este ejercicio está en uso en alguna rutina. Quítalo de las rutinas antes de eliminarlo.'
            );
          }
        },
      },
    ]);
  }

  if (loading) {
    return <LoadingView />;
  }

  if (!exercise) {
    return (
      <ScreenScroll>
        <Text style={styles.missing}>El ejercicio ya no existe.</Text>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <Card>
        <Field label="Nombre">
          <AppTextInput value={name} onChangeText={setName} />
        </Field>
        <Field label="Explicación breve" hint="Se mostrará durante el entrenamiento.">
          <AppTextInput
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={4}
            style={styles.multiline}
          />
        </Field>
        <PrimaryButton title="Guardar cambios" onPress={handleSave} loading={saving} />
      </Card>

      <SectionTitle>Progreso</SectionTitle>
      <SecondaryButton
        title="Ver historial de pesos y notas"
        onPress={() => router.push({ pathname: '/progress/[exerciseId]', params: { exerciseId } })}
      />

      <SectionTitle>Zona peligrosa</SectionTitle>
      <SecondaryButton title="Eliminar ejercicio" tone="danger" onPress={handleDelete} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  missing: {
    color: colors.textDim,
    fontSize: 15,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
