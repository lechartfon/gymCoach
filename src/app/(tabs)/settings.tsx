import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, ScreenScroll, SecondaryButton, SectionTitle, uiStyles } from '@/components/ui';
import {
  getExportPayload,
  getRoutinesTransferData,
  importPayload,
  importRoutines,
  isValidExportPayload,
  listRoutines,
  seedSampleData,
  wipeAllData,
} from '@/db/repo';
import { buildCsv, buildCsvRowsFromExport } from '@/logic/csv';
import { pickJsonFile, shareTextFile } from '@/logic/files';
import {
  buildRoutinesPayload,
  isValidRoutinesPayload,
  summarizeRoutinesPayload,
} from '@/logic/routineTransfer';
import { colors, spacing } from '@/theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState<string | null>(null);
  const [routineCount, setRoutineCount] = useState(0);

  const load = useCallback(async () => {
    const routines = await listRoutines(db);
    setRoutineCount(routines.length);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleExportJson() {
    setBusy('json');
    try {
      const payload = await getExportPayload(db);
      const date = new Date().toISOString().slice(0, 10);
      await shareTextFile({
        fileName: `gymcoach-copia-${date}.json`,
        content: JSON.stringify(payload, null, 2),
        mimeType: 'application/json',
        dialogTitle: 'Guardar copia de seguridad',
      });
    } catch (error) {
      Alert.alert('No se pudo exportar', error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setBusy(null);
    }
  }

  async function handleExportCsv() {
    setBusy('csv');
    try {
      const payload = await getExportPayload(db);
      const csv = buildCsv(buildCsvRowsFromExport(payload.data));
      const date = new Date().toISOString().slice(0, 10);
      await shareTextFile({
        fileName: `gymcoach-historial-${date}.csv`,
        content: csv,
        mimeType: 'text/csv',
        dialogTitle: 'Exportar historial en CSV',
      });
    } catch (error) {
      Alert.alert('No se pudo exportar', error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setBusy(null);
    }
  }

  async function handleImportJson() {    setBusy('import');
    try {
      const content = await pickJsonFile();
      if (content === null) {
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        Alert.alert('Archivo inválido', 'El archivo seleccionado no es un JSON válido.');
        return;
      }
      if (!isValidExportPayload(parsed)) {
        Alert.alert('Archivo no reconocido', 'El archivo no parece una copia de seguridad de gymCoach.');
        return;
      }
      const payload = parsed;
      Alert.alert(
        'Restaurar copia',
        'Se reemplazarán todos los datos actuales por los de la copia de seguridad. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: async () => {
              await importPayload(db, payload);
              await load();
              Alert.alert('Copia restaurada', 'Los datos se han restaurado correctamente.');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('No se pudo importar', error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setBusy(null);
    }
  }

  async function handleExportRoutines() {
    setBusy('routines-export');
    try {
      const transfers = await getRoutinesTransferData(db);
      if (transfers.length === 0) {
        Alert.alert('Sin rutinas', 'Todavía no hay rutinas para exportar.');
        return;
      }
      const payload = buildRoutinesPayload(transfers);
      const date = new Date().toISOString().slice(0, 10);
      await shareTextFile({
        fileName: `gymcoach-rutinas-${date}.json`,
        content: JSON.stringify(payload, null, 2),
        mimeType: 'application/json',
        dialogTitle: 'Compartir rutinas',
      });
    } catch (error) {
      Alert.alert('No se pudo exportar', error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setBusy(null);
    }
  }

  async function handleImportRoutines() {
    setBusy('routines-import');
    try {
      const content = await pickJsonFile();
      if (content === null) {
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        Alert.alert('Archivo inválido', 'El archivo seleccionado no es un JSON válido.');
        return;
      }
      if (!isValidRoutinesPayload(parsed)) {
        Alert.alert('Archivo no reconocido', 'El archivo no contiene rutinas exportadas desde gymCoach.');
        return;
      }
      const payload = parsed;
      const summary = summarizeRoutinesPayload(payload);
      if (summary.routines === 0) {
        Alert.alert('Sin rutinas', 'El archivo no incluye ninguna rutina.');
        return;
      }
      Alert.alert(
        'Importar rutinas',
        `Se añadirán ${summary.routines} ${summary.routines === 1 ? 'rutina' : 'rutinas'} con ${summary.exercises} ${summary.exercises === 1 ? 'ejercicio' : 'ejercicios'}. Tus rutinas actuales no se modifican. ¿Continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            onPress: async () => {
              try {
                const result = await importRoutines(db, payload.routines);
                await load();
                Alert.alert(
                  'Rutinas importadas',
                  `Añadidas: ${result.names.join(', ')}.\nEjercicios nuevos: ${result.newExercises} · reutilizados: ${result.reusedExercises}.`
                );
              } catch (error) {
                Alert.alert('No se pudo importar', error instanceof Error ? error.message : 'Error inesperado');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('No se pudo importar', error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setBusy(null);
    }
  }

  function handleSeed() {
    if (routineCount > 0) {
      Alert.alert('Ya tienes rutinas', 'Elimina los datos actuales si quieres volver a cargar el ejemplo.');
      return;
    }
    Alert.alert('Cargar ejemplo', 'Se crearán las rutinas A, B, C y D con ejercicios de muestra. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cargar',
        onPress: async () => {
          await seedSampleData(db);
          await load();
        },
      },
    ]);
  }

  function handleWipe() {
    Alert.alert('Borrar todos los datos', 'Se eliminarán rutinas, ejercicios, entrenamientos y registros. Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar todo',
        style: 'destructive',
        onPress: async () => {
          await wipeAllData(db);
          await load();
          Alert.alert('Datos eliminados', 'La aplicación se ha quedado sin datos.');
        },
      },
    ]);
  }

  return (
    <ScreenScroll>
      <SectionTitle>Datos</SectionTitle>
      <View style={styles.card}>
        <Text style={styles.title}>Copia de seguridad</Text>
        <Text style={uiStyles.dimText}>
          Exporta un archivo JSON con todo (rutinas, ejercicios, entrenamientos y notas) para poder restaurarlo más
          adelante en este u otro dispositivo.
        </Text>
        <PrimaryButton title="Exportar copia (JSON)" onPress={handleExportJson} loading={busy === 'json'} />
        <SecondaryButton title="Restaurar copia (JSON)" onPress={handleImportJson} disabled={busy !== null} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Rutinas</Text>
        <Text style={uiStyles.dimText}>
          Exporta tus rutinas para compartirlas con quien quieras, o importa rutinas de otra persona. Al importar se
          añaden como rutinas nuevas y no se modifica nada de lo que ya tienes.
        </Text>
        <SecondaryButton
          title="Exportar rutinas (JSON)"
          onPress={handleExportRoutines}
          disabled={busy !== null}
        />
        <SecondaryButton
          title="Importar rutinas (JSON)"
          onPress={handleImportRoutines}
          disabled={busy !== null}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Historial en CSV</Text>
        <Text style={uiStyles.dimText}>
          Genera una hoja de cálculo con fecha, rutina, ejercicio, serie, peso y nota de cada entrenamiento
          completado.
        </Text>
        <SecondaryButton title="Exportar historial (CSV)" onPress={handleExportCsv} disabled={busy !== null} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Datos de ejemplo</Text>
        <Text style={uiStyles.dimText}>
          Crea las rutinas A, B, C y D con ejercicios habituales, listas para probar la aplicación.
        </Text>
        <SecondaryButton title="Cargar rutinas de ejemplo" onPress={handleSeed} disabled={busy !== null} />
      </View>

      <SectionTitle>Zona peligrosa</SectionTitle>
      <SecondaryButton title="Borrar todos los datos" tone="danger" onPress={handleWipe} disabled={busy !== null} />

      <SectionTitle>Acerca de</SectionTitle>
      <View style={styles.card}>
        <Text style={styles.title}>gymCoach {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        <Text style={uiStyles.dimText}>
          Sigue tus rutinas en el gimnasio, registra pesos y notas, y consulta tu progreso. Todos los datos se
          guardan únicamente en este dispositivo.
        </Text>
        <SecondaryButton title="Ver biblioteca de ejercicios" onPress={() => router.push('/exercise')} />
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
