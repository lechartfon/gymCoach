import { formatDateTime, formatWeight } from './format';

export type CsvRow = {
  date: number;
  routineName: string;
  exerciseName: string;
  setIndex: number;
  weightKg: number | null;
  note: string;
};

export type CsvExportData = {
  sessions: Record<string, unknown>[];
  sessionExercises: Record<string, unknown>[];
  setLogs: Record<string, unknown>[];
};

/**
 * Convierte los datos exportados de la base de datos en filas CSV,
 * usando solo entrenamientos completados.
 */
export function buildCsvRowsFromExport(data: CsvExportData): CsvRow[] {
  const sessions = new Map<
    string,
    { completedAt: number | null; routineName: string; status: string }
  >();
  for (const row of data.sessions) {
    sessions.set(row.id as string, {
      completedAt: (row.completed_at as number | null) ?? null,
      routineName: (row.routine_name as string) ?? '',
      status: (row.status as string) ?? 'active',
    });
  }

  const sessionExercises = new Map<string, { sessionId: string; exerciseName: string; note: string }>();
  for (const row of data.sessionExercises) {
    sessionExercises.set(row.id as string, {
      sessionId: row.session_id as string,
      exerciseName: (row.exercise_name as string) ?? '',
      note: (row.note as string) ?? '',
    });
  }

  const rows: CsvRow[] = [];
  for (const row of data.setLogs) {
    const exercise = sessionExercises.get(row.session_exercise_id as string);
    if (!exercise) {
      continue;
    }
    const session = sessions.get(exercise.sessionId);
    if (!session || session.status !== 'completed' || session.completedAt === null) {
      continue;
    }
    rows.push({
      date: session.completedAt,
      routineName: session.routineName,
      exerciseName: exercise.exerciseName,
      setIndex: row.set_index as number,
      weightKg: (row.weight_kg as number | null) ?? null,
      note: exercise.note,
    });
  }
  return rows;
}

function escapeCell(value: string): string {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Genera un CSV con una fila por serie registrada, separado por ";"
 * para facilitar su apertura en hojas de cálculo en español.
 */
export function buildCsv(rows: CsvRow[]): string {
  const header = 'fecha;rutina;ejercicio;serie;peso_kg;nota';
  const sorted = [...rows].sort(
    (a, b) =>
      a.date - b.date ||
      a.routineName.localeCompare(b.routineName) ||
      a.exerciseName.localeCompare(b.exerciseName) ||
      a.setIndex - b.setIndex
  );
  const lines = sorted.map((row) =>
    [
      formatDateTime(row.date),
      escapeCell(row.routineName),
      escapeCell(row.exerciseName),
      String(row.setIndex),
      row.weightKg === null ? '' : formatWeight(row.weightKg),
      escapeCell(row.note.replace(/\r?\n/g, ' ')),
    ].join(';')
  );
  return [header, ...lines].join('\r\n') + '\r\n';
}
