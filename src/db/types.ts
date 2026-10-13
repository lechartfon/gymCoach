export type Exercise = {
  id: string;
  name: string;
  instructions: string;
  createdAt: number;
  updatedAt: number;
};

export type Routine = {
  id: string;
  name: string;
  position: number;
  createdAt: number;
  updatedAt: number;
};

export type RoutineExerciseItem = {
  id: string;
  routineId: string;
  exerciseId: string;
  position: number;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  exerciseName: string;
  instructions: string;
};

export type SessionStatus = 'active' | 'completed';

export type RestState = {
  endsAt: number | null;
  remainingMs: number | null;
  totalSeconds: number | null;
};

export type WorkoutSession = {
  id: string;
  routineId: string | null;
  routineName: string;
  status: SessionStatus;
  startedAt: number;
  completedAt: number | null;
  currentIndex: number;
  restEndsAt: number | null;
  restRemainingMs: number | null;
  restTotalSeconds: number | null;
};

export type SessionExercise = {
  id: string;
  sessionId: string;
  exerciseId: string | null;
  exerciseName: string;
  instructions: string;
  position: number;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  note: string;
  completed: boolean;
};

export type SetLog = {
  id: string;
  sessionExerciseId: string;
  setIndex: number;
  weightKg: number | null;
  completedAt: number;
};

export type SessionExerciseWithSets = SessionExercise & {
  sets: SetLog[];
};

export type SessionDetail = {
  session: WorkoutSession;
  exercises: SessionExerciseWithSets[];
};

export type SessionSummary = WorkoutSession & {
  exerciseCount: number;
  setCount: number;
};

export type ExerciseHistoryEntry = {
  sessionId: string;
  date: number;
  routineName: string;
  note: string;
  sets: { setIndex: number; weightKg: number | null }[];
};

export type ExportPayload = {
  app: 'gymCoach';
  version: 1;
  exportedAt: number;
  data: {
    exercises: Record<string, unknown>[];
    routines: Record<string, unknown>[];
    routineExercises: Record<string, unknown>[];
    sessions: Record<string, unknown>[];
    sessionExercises: Record<string, unknown>[];
    setLogs: Record<string, unknown>[];
  };
};

export type RoutineSuggestion = { id: string; position: number };
