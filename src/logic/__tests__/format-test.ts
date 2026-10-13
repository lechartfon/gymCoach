import {
  formatClock,
  formatDate,
  formatDateTime,
  formatDurationMs,
  formatWeight,
  parsePositiveInt,
  parseWeight,
} from '../format';

describe('formatClock', () => {
  it('muestra minutos y segundos', () => {
    expect(formatClock(90_000)).toBe('1:30');
  });

  it('redondea hacia arriba al segundo', () => {
    expect(formatClock(500)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
  });

  it('nunca muestra valores negativos', () => {
    expect(formatClock(-5000)).toBe('0:00');
  });

  it('incluye horas cuando hace falta', () => {
    expect(formatClock(3_661_000)).toBe('1:01:01');
  });
});

describe('parseWeight', () => {
  it('acepta punto decimal', () => {
    expect(parseWeight('42.5')).toBe(42.5);
  });

  it('acepta coma decimal', () => {
    expect(parseWeight('42,5')).toBe(42.5);
  });

  it('devuelve null con texto vacío', () => {
    expect(parseWeight('')).toBeNull();
    expect(parseWeight('   ')).toBeNull();
  });

  it('devuelve null con texto inválido o negativo', () => {
    expect(parseWeight('abc')).toBeNull();
    expect(parseWeight('-5')).toBeNull();
  });
});

describe('parsePositiveInt', () => {
  it('acepta enteros', () => {
    expect(parsePositiveInt('12')).toBe(12);
  });

  it('rechaza decimales y texto', () => {
    expect(parsePositiveInt('1.5')).toBeNull();
    expect(parsePositiveInt('abc')).toBeNull();
    expect(parsePositiveInt('')).toBeNull();
  });

  it('respeta el máximo', () => {
    expect(parsePositiveInt('999', 20)).toBeNull();
  });
});

describe('formatWeight', () => {
  it('sin decimales cuando es entero', () => {
    expect(formatWeight(40)).toBe('40');
  });

  it('con un decimal', () => {
    expect(formatWeight(42.5)).toBe('42.5');
  });

  it('guion cuando es nulo', () => {
    expect(formatWeight(null)).toBe('—');
  });
});

describe('formatDurationMs', () => {
  it('menos de un minuto', () => {
    expect(formatDurationMs(30_000)).toBe('menos de 1 min');
  });

  it('minutos', () => {
    expect(formatDurationMs(45 * 60_000)).toBe('45 min');
  });

  it('horas y minutos', () => {
    expect(formatDurationMs(65 * 60_000)).toBe('1 h 5 min');
  });
});

describe('formatDate', () => {
  it('formatea en español', () => {
    expect(formatDate(new Date(2026, 0, 5, 9, 30).getTime())).toBe('lun 5 ene 2026');
  });
});

describe('formatDateTime', () => {
  it('usa un formato ordenable para CSV', () => {
    expect(formatDateTime(new Date(2026, 0, 5, 9, 30).getTime())).toBe('2026-01-05 09:30');
  });
});
