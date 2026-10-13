import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: string[] = [
  `
CREATE TABLE exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE routines (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE routine_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps TEXT NOT NULL DEFAULT '10',
  rest_seconds INTEGER NOT NULL DEFAULT 90
);

CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT REFERENCES routines(id) ON DELETE SET NULL,
  routine_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  current_index INTEGER NOT NULL DEFAULT 0,
  rest_ends_at INTEGER,
  rest_remaining_ms INTEGER,
  rest_total_seconds INTEGER
);

CREATE TABLE session_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL,
  target_sets INTEGER NOT NULL,
  target_reps TEXT NOT NULL,
  rest_seconds INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  completed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE set_logs (
  id TEXT PRIMARY KEY NOT NULL,
  session_exercise_id TEXT NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  weight_kg REAL,
  completed_at INTEGER NOT NULL
);

CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id, position);
CREATE INDEX idx_session_exercises_session ON session_exercises(session_id, position);
CREATE INDEX idx_set_logs_session_exercise ON set_logs(session_exercise_id, set_index);
CREATE INDEX idx_workout_sessions_status ON workout_sessions(status, completed_at);
`,
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= MIGRATIONS.length) {
    return;
  }

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRATIONS[i]);
    });
  }

  await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
}
