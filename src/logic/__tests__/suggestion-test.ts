import { nextSuggestion } from '../suggestion';

const routines = [
  { id: 'a', position: 0 },
  { id: 'b', position: 1 },
  { id: 'c', position: 2 },
  { id: 'd', position: 3 },
];

describe('nextSuggestion', () => {
  it('devuelve null si no hay rutinas', () => {
    expect(nextSuggestion([], null)).toBeNull();
  });

  it('sin historial sugiere la primera rutina', () => {
    expect(nextSuggestion(routines, null)?.id).toBe('a');
  });

  it('tras completar la rutina A sugiere la B', () => {
    expect(nextSuggestion(routines, 'a')?.id).toBe('b');
  });

  it('tras completar la rutina C sugiere la D', () => {
    expect(nextSuggestion(routines, 'c')?.id).toBe('d');
  });

  it('tras completar la última rutina vuelve a la primera', () => {
    expect(nextSuggestion(routines, 'd')?.id).toBe('a');
  });

  it('si la última rutina completada ya no existe, sugiere la primera', () => {
    expect(nextSuggestion(routines, 'eliminada')?.id).toBe('a');
  });

  it('ordena por posición aunque la lista llegue desordenada', () => {
    const shuffled = [routines[3], routines[1], routines[2], routines[0]];
    expect(nextSuggestion(shuffled, 'a')?.id).toBe('b');
    expect(nextSuggestion(shuffled, null)?.id).toBe('a');
  });
});
