import type { RoutineSuggestion } from '@/db/types';

/**
 * Devuelve la siguiente rutina sugerida según el orden configurado.
 * - Sin historial: la primera rutina de la lista.
 * - Tras completar una rutina: la siguiente en el orden, con vuelta a la primera.
 * - Si la última rutina completada ya no existe: la primera.
 */
export function nextSuggestion<T extends RoutineSuggestion>(
  routines: T[],
  lastCompletedRoutineId: string | null
): T | null {
  if (routines.length === 0) {
    return null;
  }

  const sorted = [...routines].sort((a, b) => a.position - b.position);

  if (!lastCompletedRoutineId) {
    return sorted[0];
  }

  const index = sorted.findIndex((routine) => routine.id === lastCompletedRoutineId);
  if (index === -1) {
    return sorted[0];
  }

  return sorted[(index + 1) % sorted.length];
}
