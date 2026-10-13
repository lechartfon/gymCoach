export type RoutineTransferExercise = {
  name: string;
  instructions?: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
};

export type RoutineTransfer = {
  name: string;
  exercises: RoutineTransferExercise[];
};

export type RoutinesPayload = {
  app: 'gymCoach';
  type: 'routines';
  version: 1;
  exportedAt: number;
  routines: RoutineTransfer[];
};

export type RoutineWithItems = {
  name: string;
  items: RoutineTransferExercise[];
};

export type RoutinesImportSummary = {
  routines: number;
  exercises: number;
};

/** Clave para comparar nombres de ejercicios sin distinguir mayúsculas ni espacios. */
export function normalizeExerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Nombre de archivo seguro a partir del nombre de una rutina. */
export function routineFileSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'rutina';
}

/**
 * Si ya existe una rutina con el mismo nombre, añade un sufijo
 * «(importada)» para no confundirlas.
 */
export function resolveRoutineName(name: string, existingNames: Set<string>): string {
  const base = name.trim() || 'Rutina';
  if (!existingNames.has(base.toLowerCase())) {
    return base;
  }
  let candidate = `${base} (importada)`;
  let counter = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${base} (importada ${counter})`;
    counter += 1;
  }
  return candidate;
}

export function buildRoutinesPayload(routines: RoutineWithItems[]): RoutinesPayload {
  return {
    app: 'gymCoach',
    type: 'routines',
    version: 1,
    exportedAt: Date.now(),
    routines: routines.map((routine) => ({
      name: routine.name.trim(),
      exercises: routine.items.map((item) => ({
        name: item.name.trim(),
        instructions: (item.instructions ?? '').trim(),
        targetSets: item.targetSets,
        targetReps: item.targetReps.trim(),
        restSeconds: item.restSeconds,
      })),
    })),
  };
}

function isValidRoutineTransfer(value: unknown): value is RoutineTransfer {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const routine = value as Partial<RoutineTransfer>;
  if (typeof routine.name !== 'string' || routine.name.trim() === '' || routine.name.length > 120) {
    return false;
  }
  if (!Array.isArray(routine.exercises)) {
    return false;
  }
  return routine.exercises.every((exercise) => {
    if (!exercise || typeof exercise !== 'object') {
      return false;
    }
    const candidate = exercise as Partial<RoutineTransferExercise>;
    if (typeof candidate.name !== 'string' || candidate.name.trim() === '' || candidate.name.length > 120) {
      return false;
    }
    if (candidate.instructions !== undefined && typeof candidate.instructions !== 'string') {
      return false;
    }
    if (
      typeof candidate.targetSets !== 'number' ||
      !Number.isInteger(candidate.targetSets) ||
      candidate.targetSets < 1 ||
      candidate.targetSets > 50
    ) {
      return false;
    }
    if (
      typeof candidate.targetReps !== 'string' ||
      candidate.targetReps.trim() === '' ||
      candidate.targetReps.length > 40
    ) {
      return false;
    }
    if (
      typeof candidate.restSeconds !== 'number' ||
      !Number.isInteger(candidate.restSeconds) ||
      candidate.restSeconds < 0 ||
      candidate.restSeconds > 3600
    ) {
      return false;
    }
    return true;
  });
}

export function isValidRoutinesPayload(payload: unknown): payload is RoutinesPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Partial<RoutinesPayload>;
  if (candidate.app !== 'gymCoach' || candidate.type !== 'routines' || candidate.version !== 1) {
    return false;
  }
  if (!Array.isArray(candidate.routines)) {
    return false;
  }
  return candidate.routines.every(isValidRoutineTransfer);
}

export function summarizeRoutinesPayload(payload: RoutinesPayload): RoutinesImportSummary {
  return {
    routines: payload.routines.length,
    exercises: payload.routines.reduce((sum, routine) => sum + routine.exercises.length, 0),
  };
}
