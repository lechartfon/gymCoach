import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Exercise,
  ExerciseHistoryEntry,
  ExportPayload,
  RestState,
  Routine,
  RoutineExerciseItem,
  SessionDetail,
  SessionExercise,
  SessionExerciseWithSets,
  SessionSummary,
  SetLog,
  WorkoutSession,
} from './types';

type ExerciseRow = {
  id: string;
  name: string;
  instructions: string;
  created_at: number;
  updated_at: number;
};

type RoutineRow = {
  id: string;
  name: string;
  position: number;
  created_at: number;
  updated_at: number;
};

type RoutineExerciseRow = {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  exercise_name: string;
  instructions: string;
};

type SessionRow = {
  id: string;
  routine_id: string | null;
  routine_name: string;
  status: string;
  started_at: number;
  completed_at: number | null;
  current_index: number;
  rest_ends_at: number | null;
  rest_remaining_ms: number | null;
  rest_total_seconds: number | null;
};

type SessionExerciseRow = {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  instructions: string;
  position: number;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  note: string;
  completed: number;
};

type SetLogRow = {
  id: string;
  session_exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  completed_at: number;
};

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoutineItem(row: RoutineExerciseRow): RoutineExerciseItem {
  return {
    id: row.id,
    routineId: row.routine_id,
    exerciseId: row.exercise_id,
    position: row.position,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    restSeconds: row.rest_seconds,
    exerciseName: row.exercise_name,
    instructions: row.instructions,
  };
}

function mapSession(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    routineId: row.routine_id,
    routineName: row.routine_name,
    status: row.status === 'completed' ? 'completed' : 'active',
    startedAt: row.started_at,
    completedAt: row.completed_at,
    currentIndex: row.current_index,
    restEndsAt: row.rest_ends_at,
    restRemainingMs: row.rest_remaining_ms,
    restTotalSeconds: row.rest_total_seconds,
  };
}

function mapSessionExercise(row: SessionExerciseRow): SessionExercise {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    instructions: row.instructions,
    position: row.position,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    restSeconds: row.rest_seconds,
    note: row.note,
    completed: row.completed === 1,
  };
}

function mapSetLog(row: SetLogRow): SetLog {
  return {
    id: row.id,
    sessionExerciseId: row.session_exercise_id,
    setIndex: row.set_index,
    weightKg: row.weight_kg,
    completedAt: row.completed_at,
  };
}

/* ------------------------------- Ejercicios ------------------------------- */

export async function listExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>('SELECT * FROM exercises ORDER BY name COLLATE NOCASE ASC');
  return rows.map(mapExercise);
}

export async function getExercise(db: SQLiteDatabase, id: string): Promise<Exercise | null> {
  const row = await db.getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE id = ?', [id]);
  return row ? mapExercise(row) : null;
}

export async function createExercise(
  db: SQLiteDatabase,
  name: string,
  instructions: string
): Promise<Exercise> {
  const now = Date.now();
  const id = randomUUID();
  await db.runAsync(
    'INSERT INTO exercises (id, name, instructions, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, name.trim(), instructions.trim(), now, now]
  );
  return { id, name: name.trim(), instructions: instructions.trim(), createdAt: now, updatedAt: now };
}

export async function updateExercise(
  db: SQLiteDatabase,
  id: string,
  name: string,
  instructions: string
): Promise<void> {
  await db.runAsync('UPDATE exercises SET name = ?, instructions = ?, updated_at = ? WHERE id = ?', [
    name.trim(),
    instructions.trim(),
    Date.now(),
    id,
  ]);
}

export async function deleteExercise(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
}

/* -------------------------------- Rutinas --------------------------------- */

export async function listRoutines(db: SQLiteDatabase): Promise<Routine[]> {
  const rows = await db.getAllAsync<RoutineRow>('SELECT * FROM routines ORDER BY position ASC');
  return rows.map(mapRoutine);
}

export async function getRoutine(db: SQLiteDatabase, id: string): Promise<Routine | null> {
  const row = await db.getFirstAsync<RoutineRow>('SELECT * FROM routines WHERE id = ?', [id]);
  return row ? mapRoutine(row) : null;
}

export async function getRoutineItems(db: SQLiteDatabase, routineId: string): Promise<RoutineExerciseItem[]> {
  const rows = await db.getAllAsync<RoutineExerciseRow>(
    `SELECT re.*, e.name AS exercise_name, e.instructions
     FROM routine_exercises re
     JOIN exercises e ON e.id = re.exercise_id
     WHERE re.routine_id = ?
     ORDER BY re.position ASC`,
    [routineId]
  );
  return rows.map(mapRoutineItem);
}

export async function getRoutineItemCounts(db: SQLiteDatabase): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ routine_id: string; total: number }>(
    'SELECT routine_id, COUNT(*) AS total FROM routine_exercises GROUP BY routine_id'
  );
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.routine_id] = row.total;
  }
  return counts;
}

export async function createRoutine(db: SQLiteDatabase, name: string): Promise<Routine> {
  const now = Date.now();
  const id = randomUUID();
  const row = await db.getFirstAsync<{ next: number | null }>('SELECT MAX(position) + 1 AS next FROM routines');
  const position = row?.next ?? 0;
  await db.runAsync('INSERT INTO routines (id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    name.trim(),
    position,
    now,
    now,
  ]);
  return { id, name: name.trim(), position, createdAt: now, updatedAt: now };
}

export async function renameRoutine(db: SQLiteDatabase, id: string, name: string): Promise<void> {
  await db.runAsync('UPDATE routines SET name = ?, updated_at = ? WHERE id = ?', [name.trim(), Date.now(), id]);
}

export async function deleteRoutine(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM routines WHERE id = ?', [id]);
    const rows = await txn.getAllAsync<{ id: string }>('SELECT id FROM routines ORDER BY position ASC');
    for (let i = 0; i < rows.length; i++) {
      await txn.runAsync('UPDATE routines SET position = ? WHERE id = ?', [i, rows[i].id]);
    }
  });
}

async function renumberRoutineItems(txn: SQLiteDatabase, routineId: string): Promise<void> {
  const rows = await txn.getAllAsync<{ id: string }>(
    'SELECT id FROM routine_exercises WHERE routine_id = ? ORDER BY position ASC',
    [routineId]
  );
  for (let i = 0; i < rows.length; i++) {
    await txn.runAsync('UPDATE routine_exercises SET position = ? WHERE id = ?', [i, rows[i].id]);
  }
}

export async function addExerciseToRoutine(
  db: SQLiteDatabase,
  routineId: string,
  exerciseId: string,
  options: { targetSets: number; targetReps: string; restSeconds: number }
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const row = await txn.getFirstAsync<{ next: number | null }>(
      'SELECT MAX(position) + 1 AS next FROM routine_exercises WHERE routine_id = ?',
      [routineId]
    );
    const position = row?.next ?? 0;
    await txn.runAsync(
      `INSERT INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), routineId, exerciseId, position, options.targetSets, options.targetReps, options.restSeconds]
    );
  });
}

export async function updateRoutineItem(
  db: SQLiteDatabase,
  itemId: string,
  options: { targetSets: number; targetReps: string; restSeconds: number }
): Promise<void> {
  await db.runAsync(
    'UPDATE routine_exercises SET target_sets = ?, target_reps = ?, rest_seconds = ? WHERE id = ?',
    [options.targetSets, options.targetReps, options.restSeconds, itemId]
  );
}

export async function removeRoutineItem(db: SQLiteDatabase, itemId: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const row = await txn.getFirstAsync<{ routine_id: string }>(
      'SELECT routine_id FROM routine_exercises WHERE id = ?',
      [itemId]
    );
    if (!row) {
      return;
    }
    await txn.runAsync('DELETE FROM routine_exercises WHERE id = ?', [itemId]);
    await renumberRoutineItems(txn, row.routine_id);
  });
}

export async function moveRoutineItem(db: SQLiteDatabase, itemId: string, direction: -1 | 1): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const current = await txn.getFirstAsync<{ routine_id: string; position: number }>(
      'SELECT routine_id, position FROM routine_exercises WHERE id = ?',
      [itemId]
    );
    if (!current) {
      return;
    }
    const neighbor = await txn.getFirstAsync<{ id: string; position: number }>(
      'SELECT id, position FROM routine_exercises WHERE routine_id = ? AND position = ?',
      [current.routine_id, current.position + direction]
    );
    if (!neighbor) {
      return;
    }
    await txn.runAsync('UPDATE routine_exercises SET position = ? WHERE id = ?', [neighbor.position, itemId]);
    await txn.runAsync('UPDATE routine_exercises SET position = ? WHERE id = ?', [current.position, neighbor.id]);
  });
}

/* ------------------------------- Sesiones --------------------------------- */

export async function getActiveSession(db: SQLiteDatabase): Promise<WorkoutSession | null> {
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT * FROM workout_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`
  );
  return row ? mapSession(row) : null;
}

export async function getSession(db: SQLiteDatabase, id: string): Promise<WorkoutSession | null> {
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM workout_sessions WHERE id = ?', [id]);
  return row ? mapSession(row) : null;
}

export async function startSession(db: SQLiteDatabase, routineId: string): Promise<string> {
  const existing = await getActiveSession(db);
  if (existing) {
    return existing.id;
  }

  const routine = await getRoutine(db, routineId);
  if (!routine) {
    throw new Error('La rutina no existe');
  }
  const items = await getRoutineItems(db, routineId);
  const id = randomUUID();
  const now = Date.now();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO workout_sessions (id, routine_id, routine_name, status, started_at, current_index)
       VALUES (?, ?, ?, 'active', ?, 0)`,
      [id, routineId, routine.name, now]
    );
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await txn.runAsync(
        `INSERT INTO session_exercises
           (id, session_id, exercise_id, exercise_name, instructions, position, target_sets, target_reps, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          id,
          item.exerciseId,
          item.exerciseName,
          item.instructions,
          i,
          item.targetSets,
          item.targetReps,
          item.restSeconds,
        ]
      );
    }
  });

  return id;
}

export async function getSessionDetail(db: SQLiteDatabase, sessionId: string): Promise<SessionDetail | null> {
  const sessionRow = await db.getFirstAsync<SessionRow>('SELECT * FROM workout_sessions WHERE id = ?', [sessionId]);
  if (!sessionRow) {
    return null;
  }

  const exerciseRows = await db.getAllAsync<SessionExerciseRow>(
    'SELECT * FROM session_exercises WHERE session_id = ? ORDER BY position ASC',
    [sessionId]
  );
  const setRows = await db.getAllAsync<SetLogRow>(
    `SELECT sl.* FROM set_logs sl
     JOIN session_exercises se ON se.id = sl.session_exercise_id
     WHERE se.session_id = ?
     ORDER BY sl.set_index ASC`,
    [sessionId]
  );

  const setsByExercise = new Map<string, SetLog[]>();
  for (const row of setRows) {
    const log = mapSetLog(row);
    const list = setsByExercise.get(log.sessionExerciseId) ?? [];
    list.push(log);
    setsByExercise.set(log.sessionExerciseId, list);
  }

  const exercises: SessionExerciseWithSets[] = exerciseRows.map((row) => ({
    ...mapSessionExercise(row),
    sets: setsByExercise.get(row.id) ?? [],
  }));

  return { session: mapSession(sessionRow), exercises };
}

export async function setSessionCurrentIndex(db: SQLiteDatabase, sessionId: string, index: number): Promise<void> {
  await db.runAsync('UPDATE workout_sessions SET current_index = ? WHERE id = ?', [index, sessionId]);
}

export async function setSessionRest(db: SQLiteDatabase, sessionId: string, rest: RestState): Promise<void> {
  await db.runAsync(
    'UPDATE workout_sessions SET rest_ends_at = ?, rest_remaining_ms = ?, rest_total_seconds = ? WHERE id = ?',
    [rest.endsAt, rest.remainingMs, rest.totalSeconds, sessionId]
  );
}

export async function setExerciseNote(db: SQLiteDatabase, sessionExerciseId: string, note: string): Promise<void> {
  await db.runAsync('UPDATE session_exercises SET note = ? WHERE id = ?', [note, sessionExerciseId]);
}

export async function logSet(
  db: SQLiteDatabase,
  sessionExerciseId: string,
  setIndex: number,
  weightKg: number | null
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM set_logs WHERE session_exercise_id = ? AND set_index = ?', [
      sessionExerciseId,
      setIndex,
    ]);
    await txn.runAsync(
      'INSERT INTO set_logs (id, session_exercise_id, set_index, weight_kg, completed_at) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), sessionExerciseId, setIndex, weightKg, Date.now()]
    );
  });
}

export async function removeSetLog(
  db: SQLiteDatabase,
  sessionExerciseId: string,
  setIndex: number
): Promise<void> {
  await db.runAsync('DELETE FROM set_logs WHERE session_exercise_id = ? AND set_index = ?', [
    sessionExerciseId,
    setIndex,
  ]);
}

export async function markExerciseCompleted(
  db: SQLiteDatabase,
  sessionExerciseId: string,
  completed: boolean
): Promise<void> {
  await db.runAsync('UPDATE session_exercises SET completed = ? WHERE id = ?', [completed ? 1 : 0, sessionExerciseId]);
}

export async function completeSession(db: SQLiteDatabase, sessionId: string): Promise<void> {
  await db.runAsync(
    `UPDATE workout_sessions
     SET status = 'completed', completed_at = ?, rest_ends_at = NULL, rest_remaining_ms = NULL, rest_total_seconds = NULL
     WHERE id = ?`,
    [Date.now(), sessionId]
  );
}

export async function deleteSession(db: SQLiteDatabase, sessionId: string): Promise<void> {
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
}

export async function listCompletedSessions(db: SQLiteDatabase, limit = 100): Promise<SessionSummary[]> {
  const rows = await db.getAllAsync<SessionRow & { exercise_count: number; set_count: number }>(
    `SELECT s.*,
       (SELECT COUNT(*) FROM session_exercises e WHERE e.session_id = s.id) AS exercise_count,
       (SELECT COUNT(*) FROM set_logs l JOIN session_exercises e ON e.id = l.session_exercise_id WHERE e.session_id = s.id) AS set_count
     FROM workout_sessions s
     WHERE s.status = 'completed'
     ORDER BY s.completed_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({
    ...mapSession(row),
    exerciseCount: row.exercise_count,
    setCount: row.set_count,
  }));
}

export async function getLastCompletedRoutineId(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ routine_id: string | null }>(
    `SELECT routine_id FROM workout_sessions
     WHERE status = 'completed'
     ORDER BY completed_at DESC
     LIMIT 1`
  );
  return row?.routine_id ?? null;
}

export async function getLastWeightForExercise(db: SQLiteDatabase, exerciseId: string): Promise<number | null> {
  const row = await db.getFirstAsync<{ weight_kg: number | null }>(
    `SELECT sl.weight_kg FROM set_logs sl
     JOIN session_exercises se ON se.id = sl.session_exercise_id
     WHERE se.exercise_id = ? AND sl.weight_kg IS NOT NULL
     ORDER BY sl.completed_at DESC
     LIMIT 1`,
    [exerciseId]
  );
  return row?.weight_kg ?? null;
}

export async function getExerciseHistory(
  db: SQLiteDatabase,
  exerciseId: string,
  limit = 50
): Promise<ExerciseHistoryEntry[]> {
  const sessionRows = await db.getAllAsync<{
    session_id: string;
    completed_at: number;
    routine_name: string;
    note: string;
  }>(
    `SELECT se.session_id, s.completed_at, s.routine_name, se.note
     FROM session_exercises se
     JOIN workout_sessions s ON s.id = se.session_id
     WHERE se.exercise_id = ? AND s.status = 'completed' AND s.completed_at IS NOT NULL
     ORDER BY s.completed_at DESC
     LIMIT ?`,
    [exerciseId, limit]
  );

  if (sessionRows.length === 0) {
    return [];
  }

  const setRows = await db.getAllAsync<{ session_id: string; set_index: number; weight_kg: number | null }>(
    `SELECT se.session_id, sl.set_index, sl.weight_kg
     FROM set_logs sl
     JOIN session_exercises se ON se.id = sl.session_exercise_id
     JOIN workout_sessions s ON s.id = se.session_id
     WHERE se.exercise_id = ? AND s.status = 'completed'
     ORDER BY s.completed_at DESC, sl.set_index ASC`,
    [exerciseId]
  );

  const setsBySession = new Map<string, { setIndex: number; weightKg: number | null }[]>();
  for (const row of setRows) {
    const list = setsBySession.get(row.session_id) ?? [];
    list.push({ setIndex: row.set_index, weightKg: row.weight_kg });
    setsBySession.set(row.session_id, list);
  }

  return sessionRows.map((row) => ({
    sessionId: row.session_id,
    date: row.completed_at,
    routineName: row.routine_name,
    note: row.note,
    sets: setsBySession.get(row.session_id) ?? [],
  }));
}

/* --------------------------- Exportar / importar --------------------------- */

export async function getExportPayload(db: SQLiteDatabase): Promise<ExportPayload> {
  return {
    app: 'gymCoach',
    version: 1,
    exportedAt: Date.now(),
    data: {
      exercises: await db.getAllAsync<Record<string, unknown>>('SELECT * FROM exercises'),
      routines: await db.getAllAsync<Record<string, unknown>>('SELECT * FROM routines'),
      routineExercises: await db.getAllAsync<Record<string, unknown>>('SELECT * FROM routine_exercises'),
      sessions: await db.getAllAsync<Record<string, unknown>>('SELECT * FROM workout_sessions'),
      sessionExercises: await db.getAllAsync<Record<string, unknown>>('SELECT * FROM session_exercises'),
      setLogs: await db.getAllAsync<Record<string, unknown>>('SELECT * FROM set_logs'),
    },
  };
}

export async function wipeAllData(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      DELETE FROM set_logs;
      DELETE FROM session_exercises;
      DELETE FROM workout_sessions;
      DELETE FROM routine_exercises;
      DELETE FROM routines;
      DELETE FROM exercises;
    `);
  });
}

export function isValidExportPayload(payload: unknown): payload is ExportPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Partial<ExportPayload>;
  if (candidate.app !== 'gymCoach' || candidate.version !== 1 || !candidate.data) {
    return false;
  }
  const data = candidate.data as ExportPayload['data'];
  return (
    Array.isArray(data.exercises) &&
    Array.isArray(data.routines) &&
    Array.isArray(data.routineExercises) &&
    Array.isArray(data.sessions) &&
    Array.isArray(data.sessionExercises) &&
    Array.isArray(data.setLogs)
  );
}

export async function importPayload(db: SQLiteDatabase, payload: ExportPayload): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      DELETE FROM set_logs;
      DELETE FROM session_exercises;
      DELETE FROM workout_sessions;
      DELETE FROM routine_exercises;
      DELETE FROM routines;
      DELETE FROM exercises;
    `);

    for (const row of payload.data.exercises) {
      await txn.runAsync(
        'INSERT INTO exercises (id, name, instructions, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [row.id as string, row.name as string, (row.instructions as string) ?? '', row.created_at as number, row.updated_at as number]
      );
    }
    for (const row of payload.data.routines) {
      await txn.runAsync(
        'INSERT INTO routines (id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [row.id as string, row.name as string, row.position as number, row.created_at as number, row.updated_at as number]
      );
    }
    for (const row of payload.data.routineExercises) {
      await txn.runAsync(
        `INSERT INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id as string,
          row.routine_id as string,
          row.exercise_id as string,
          row.position as number,
          row.target_sets as number,
          row.target_reps as string,
          row.rest_seconds as number,
        ]
      );
    }
    for (const row of payload.data.sessions) {
      await txn.runAsync(
        `INSERT INTO workout_sessions
           (id, routine_id, routine_name, status, started_at, completed_at, current_index, rest_ends_at, rest_remaining_ms, rest_total_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id as string,
          (row.routine_id as string | null) ?? null,
          row.routine_name as string,
          row.status as string,
          row.started_at as number,
          (row.completed_at as number | null) ?? null,
          (row.current_index as number) ?? 0,
          (row.rest_ends_at as number | null) ?? null,
          (row.rest_remaining_ms as number | null) ?? null,
          (row.rest_total_seconds as number | null) ?? null,
        ]
      );
    }
    for (const row of payload.data.sessionExercises) {
      await txn.runAsync(
        `INSERT INTO session_exercises
           (id, session_id, exercise_id, exercise_name, instructions, position, target_sets, target_reps, rest_seconds, note, completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id as string,
          row.session_id as string,
          (row.exercise_id as string | null) ?? null,
          row.exercise_name as string,
          (row.instructions as string) ?? '',
          row.position as number,
          row.target_sets as number,
          row.target_reps as string,
          row.rest_seconds as number,
          (row.note as string) ?? '',
          (row.completed as number) ?? 0,
        ]
      );
    }
    for (const row of payload.data.setLogs) {
      await txn.runAsync(
        'INSERT INTO set_logs (id, session_exercise_id, set_index, weight_kg, completed_at) VALUES (?, ?, ?, ?, ?)',
        [
          row.id as string,
          row.session_exercise_id as string,
          row.set_index as number,
          (row.weight_kg as number | null) ?? null,
          row.completed_at as number,
        ]
      );
    }
  });
}

/* ------------------------------ Datos de ejemplo --------------------------- */

type SeedExercise = { name: string; instructions: string; sets: number; reps: string; rest: number };

const SEED_ROUTINES: { name: string; exercises: SeedExercise[] }[] = [
  {
    name: 'A',
    exercises: [
      {
        name: 'Sentadilla',
        instructions:
          'Pies a la anchura de los hombros. Baja flexionando rodillas y cadera manteniendo la espalda recta, hasta que los muslos queden paralelos al suelo, y sube empujando con los talones.',
        sets: 4,
        reps: '8',
        rest: 120,
      },
      {
        name: 'Press banca',
        instructions:
          'Tumbado en el banco, agarra la barra con las manos algo más anchas que los hombros. Baja la barra al pecho con control y empuja hasta extender los brazos.',
        sets: 4,
        reps: '8',
        rest: 120,
      },
      {
        name: 'Remo con barra',
        instructions:
          'Con el torso inclinado y la espalda recta, tira de la barra hacia el abdomen llevando los codos hacia atrás. Baja con control sin redondear la espalda.',
        sets: 3,
        reps: '10',
        rest: 90,
      },
      {
        name: 'Curl de bíceps',
        instructions:
          'De pie, con los codos pegados al torso, sube la barra o mancuernas flexionando los codos sin balancear el cuerpo.',
        sets: 3,
        reps: '12',
        rest: 60,
      },
    ],
  },
  {
    name: 'B',
    exercises: [
      {
        name: 'Peso muerto',
        instructions:
          'Con la barra en el suelo y las espinillas cerca de ella, agarra la barra, mantén la espalda recta y sube extendiendo cadera y rodillas a la vez. Baja con control.',
        sets: 4,
        reps: '6',
        rest: 150,
      },
      {
        name: 'Press militar',
        instructions:
          'De pie, con la barra a la altura de los hombros, empuja hacia arriba hasta extender los brazos. Evita arquear la espalda.',
        sets: 3,
        reps: '8',
        rest: 90,
      },
      {
        name: 'Dominadas',
        instructions:
          'Colgado de la barra con agarre prono, tira del cuerpo hacia arriba hasta pasar la barbilla por encima de la barra. Baja con control.',
        sets: 3,
        reps: '8',
        rest: 90,
      },
      {
        name: 'Elevaciones laterales',
        instructions:
          'Con mancuernas a los lados, eleva los brazos hasta la altura de los hombros con los codos ligeramente flexionados. Baja despacio.',
        sets: 3,
        reps: '15',
        rest: 60,
      },
    ],
  },
  {
    name: 'C',
    exercises: [
      {
        name: 'Zancadas',
        instructions:
          'Da un paso al frente y baja flexionando la rodilla trasera hasta casi tocar el suelo. Vuelve a la posición inicial alternando piernas.',
        sets: 3,
        reps: '12',
        rest: 90,
      },
      {
        name: 'Press inclinado',
        instructions:
          'En un banco inclinado, baja la barra o mancuernas a la parte alta del pecho y empuja hasta extender los brazos.',
        sets: 4,
        reps: '10',
        rest: 90,
      },
      {
        name: 'Remo con barra',
        instructions:
          'Con el torso inclinado y la espalda recta, tira de la barra hacia el abdomen llevando los codos hacia atrás. Baja con control sin redondear la espalda.',
        sets: 3,
        reps: '10',
        rest: 90,
      },
      {
        name: 'Extensión de tríceps',
        instructions:
          'Con los codos pegados al torso, extiende los brazos empujando la polea o mancuerna hacia abajo. Controla el retorno.',
        sets: 3,
        reps: '12',
        rest: 60,
      },
    ],
  },
  {
    name: 'D',
    exercises: [
      {
        name: 'Sentadilla',
        instructions:
          'Pies a la anchura de los hombros. Baja flexionando rodillas y cadera manteniendo la espalda recta, hasta que los muslos queden paralelos al suelo, y sube empujando con los talones.',
        sets: 3,
        reps: '10',
        rest: 120,
      },
      {
        name: 'Press banca',
        instructions:
          'Tumbado en el banco, agarra la barra con las manos algo más anchas que los hombros. Baja la barra al pecho con control y empuja hasta extender los brazos.',
        sets: 3,
        reps: '10',
        rest: 120,
      },
      {
        name: 'Peso muerto',
        instructions:
          'Con la barra en el suelo y las espinillas cerca de ella, agarra la barra, mantén la espalda recta y sube extendiendo cadera y rodillas a la vez. Baja con control.',
        sets: 3,
        reps: '8',
        rest: 150,
      },
      {
        name: 'Plancha',
        instructions:
          'Apóyate sobre antebrazos y puntas de los pies manteniendo el cuerpo alineado. Aguanta el tiempo indicado sin hundir la cadera.',
        sets: 3,
        reps: '1 min',
        rest: 45,
      },
    ],
  },
];

export async function seedSampleData(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const exerciseIds = new Map<string, string>();

    for (const routine of SEED_ROUTINES) {
      for (const item of routine.exercises) {
        if (!exerciseIds.has(item.name)) {
          const id = randomUUID();
          exerciseIds.set(item.name, id);
          await txn.runAsync(
            'INSERT INTO exercises (id, name, instructions, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [id, item.name, item.instructions, now, now]
          );
        }
      }
    }

    for (let r = 0; r < SEED_ROUTINES.length; r++) {
      const routine = SEED_ROUTINES[r];
      const routineId = randomUUID();
      await txn.runAsync('INSERT INTO routines (id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
        routineId,
        routine.name,
        r,
        now,
        now,
      ]);
      for (let i = 0; i < routine.exercises.length; i++) {
        const item = routine.exercises[i];
        const exerciseId = exerciseIds.get(item.name);
        if (!exerciseId) {
          continue;
        }
        await txn.runAsync(
          `INSERT INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [randomUUID(), routineId, exerciseId, i, item.sets, item.reps, item.rest]
        );
      }
    }
  });
}
