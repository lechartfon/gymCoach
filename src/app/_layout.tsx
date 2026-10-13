import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { migrateDbIfNeeded } from '@/db/migrations';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="gymcoach.db" onInit={migrateDbIfNeeded}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Entrenamiento' }} />
        <Stack.Screen name="session/[id]" options={{ title: 'Entrenamiento finalizado' }} />
        <Stack.Screen name="routine/new" options={{ title: 'Nueva rutina', presentation: 'modal' }} />
        <Stack.Screen name="routine/[id]/index" options={{ title: 'Rutina' }} />
        <Stack.Screen name="routine/[id]/add-exercise" options={{ title: 'Añadir ejercicio' }} />
        <Stack.Screen name="exercise/index" options={{ title: 'Ejercicios' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Ejercicio' }} />
        <Stack.Screen name="progress/[exerciseId]" options={{ title: 'Progreso' }} />
      </Stack>
    </SQLiteProvider>
  );
}
