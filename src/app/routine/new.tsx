import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from 'react-native';

import { AppTextInput, Field, PrimaryButton, Screen, ScreenScroll } from '@/components/ui';
import { createRoutine } from '@/db/repo';

export default function NewRoutineScreen() {
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Falta el nombre', 'Escribe un nombre para la rutina, por ejemplo A, B, C o D.');
      return;
    }
    setSaving(true);
    try {
      const routine = await createRoutine(db, trimmed);
      router.replace({ pathname: '/routine/[id]', params: { id: routine.id } });
    } catch (error) {
      Alert.alert('No se pudo crear', error instanceof Error ? error.message : 'Error inesperado');
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScreenScroll>
        <Field label="Nombre de la rutina" hint="Por ejemplo: A, B, C, D o «Pecho y tríceps».">
          <AppTextInput
            value={name}
            onChangeText={setName}
            placeholder="A"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
        </Field>
        <PrimaryButton title="Crear rutina" onPress={handleCreate} loading={saving} />
      </ScreenScroll>
    </Screen>
  );
}
