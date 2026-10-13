import {
  buildRoutinesPayload,
  isValidRoutinesPayload,
  normalizeExerciseKey,
  resolveRoutineName,
  routineFileSlug,
  summarizeRoutinesPayload,
} from '../routineTransfer';

const buildExample = () =>
  buildRoutinesPayload([
    {
      name: '  A  ',
      items: [
        {
          name: ' Sentadilla ',
          instructions: ' Baja con control ',
          targetSets: 4,
          targetReps: '8',
          restSeconds: 120,
        },
        { name: 'Plancha', targetSets: 3, targetReps: '1 min', restSeconds: 45 },
      ],
    },
  ]);

describe('buildRoutinesPayload', () => {
  it('limpia espacios y rellena las instrucciones que faltan', () => {
    const payload = buildExample();
    expect(payload.app).toBe('gymCoach');
    expect(payload.type).toBe('routines');
    expect(payload.version).toBe(1);
    expect(payload.routines[0].name).toBe('A');
    expect(payload.routines[0].exercises[0]).toEqual({
      name: 'Sentadilla',
      instructions: 'Baja con control',
      targetSets: 4,
      targetReps: '8',
      restSeconds: 120,
    });
    expect(payload.routines[0].exercises[1].instructions).toBe('');
  });

  it('el resultado generado siempre es válido', () => {
    expect(isValidRoutinesPayload(buildExample())).toBe(true);
  });
});

describe('isValidRoutinesPayload', () => {
  it('acepta un archivo válido sin instrucciones', () => {
    const payload = {
      app: 'gymCoach',
      type: 'routines',
      version: 1,
      exportedAt: 123,
      routines: [
        {
          name: 'B',
          exercises: [{ name: 'Remo', targetSets: 3, targetReps: '10', restSeconds: 90 }],
        },
      ],
    };
    expect(isValidRoutinesPayload(payload)).toBe(true);
  });

  it('rechaza archivos que no son de gymCoach', () => {
    expect(isValidRoutinesPayload(null)).toBe(false);
    expect(isValidRoutinesPayload({ app: 'otra', type: 'routines', version: 1, routines: [] })).toBe(false);
    expect(isValidRoutinesPayload({ app: 'gymCoach', type: 'backup', version: 1, routines: [] })).toBe(false);
    expect(isValidRoutinesPayload({ app: 'gymCoach', type: 'routines', version: 2, routines: [] })).toBe(false);
    expect(isValidRoutinesPayload({ app: 'gymCoach', type: 'routines', version: 1 })).toBe(false);
  });

  it('rechaza rutinas sin nombre o sin ejercicios válidos', () => {
    const base = {
      app: 'gymCoach',
      type: 'routines',
      version: 1,
      routines: [{ name: 'A', exercises: [] }],
    };
    expect(isValidRoutinesPayload(base)).toBe(true);
    expect(isValidRoutinesPayload({ ...base, routines: [{ name: '   ', exercises: [] }] })).toBe(false);
    expect(isValidRoutinesPayload({ ...base, routines: [{ name: 'A' }] })).toBe(false);
  });

  it('rechaza series, repeticiones o descansos fuera de rango', () => {
    const withExercise = (exercise: Record<string, unknown>) => ({
      app: 'gymCoach',
      type: 'routines',
      version: 1,
      routines: [{ name: 'A', exercises: [{ name: 'Remo', ...exercise }] }],
    });
    expect(isValidRoutinesPayload(withExercise({ targetSets: 0, targetReps: '10', restSeconds: 90 }))).toBe(false);
    expect(isValidRoutinesPayload(withExercise({ targetSets: 4.5, targetReps: '10', restSeconds: 90 }))).toBe(false);
    expect(isValidRoutinesPayload(withExercise({ targetSets: 51, targetReps: '10', restSeconds: 90 }))).toBe(false);
    expect(isValidRoutinesPayload(withExercise({ targetSets: 3, targetReps: '  ', restSeconds: 90 }))).toBe(false);
    expect(isValidRoutinesPayload(withExercise({ targetSets: 3, targetReps: '10', restSeconds: -1 }))).toBe(false);
    expect(isValidRoutinesPayload(withExercise({ targetSets: 3, targetReps: '10', restSeconds: 4000 }))).toBe(false);
    expect(isValidRoutinesPayload(withExercise({ targetSets: 3, targetReps: '10', restSeconds: 90 }))).toBe(true);
  });
});

describe('resolveRoutineName', () => {
  it('mantiene el nombre si no hay conflicto', () => {
    expect(resolveRoutineName('A', new Set(['b']))).toBe('A');
  });

  it('añade «(importada)» si el nombre ya existe', () => {
    expect(resolveRoutineName('A', new Set(['a']))).toBe('A (importada)');
  });

  it('numera las importaciones repetidas', () => {
    expect(resolveRoutineName('A', new Set(['a', 'a (importada)']))).toBe('A (importada 2)');
    expect(resolveRoutineName('A', new Set(['a', 'a (importada)', 'a (importada 2)']))).toBe('A (importada 3)');
  });

  it('usa un nombre por defecto si viene vacío', () => {
    expect(resolveRoutineName('   ', new Set())).toBe('Rutina');
  });
});

describe('routineFileSlug', () => {
  it('genera un nombre de archivo seguro', () => {
    expect(routineFileSlug('Rutina A')).toBe('rutina-a');
    expect(routineFileSlug('Pecho y tríceps!')).toBe('pecho-y-triceps');
    expect(routineFileSlug('   ')).toBe('rutina');
  });
});

describe('normalizeExerciseKey', () => {
  it('ignora mayúsculas y espacios', () => {
    expect(normalizeExerciseKey('  Sentadilla ')).toBe(normalizeExerciseKey('sentadilla'));
  });
});

describe('summarizeRoutinesPayload', () => {
  it('cuenta rutinas y ejercicios', () => {
    const payload = buildExample();
    expect(summarizeRoutinesPayload(payload)).toEqual({ routines: 1, exercises: 2 });
  });
});
