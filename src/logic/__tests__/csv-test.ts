import { buildCsv, buildCsvRowsFromExport, type CsvExportData } from '../csv';

const day1 = new Date(2026, 0, 5, 9, 30).getTime();
const day2 = new Date(2026, 0, 6, 18, 0).getTime();

describe('buildCsv', () => {
  it('genera cabecera y filas ordenadas por fecha', () => {
    const csv = buildCsv([
      { date: day2, routineName: 'B', exerciseName: 'Remo', setIndex: 1, weightKg: 45, note: '' },
      { date: day1, routineName: 'A', exerciseName: 'Sentadilla', setIndex: 2, weightKg: 80, note: '' },
      { date: day1, routineName: 'A', exerciseName: 'Sentadilla', setIndex: 1, weightKg: 80, note: '' },
    ]);

    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('fecha;rutina;ejercicio;serie;peso_kg;nota');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe('2026-01-05 09:30;A;Sentadilla;1;80;');
    expect(lines[2]).toBe('2026-01-05 09:30;A;Sentadilla;2;80;');
    expect(lines[3]).toBe('2026-01-06 18:00;B;Remo;1;45;');
  });

  it('escapa punto y coma, comillas y saltos de línea', () => {
    const csv = buildCsv([
      {
        date: day1,
        routineName: 'A;1',
        exerciseName: 'Remo "alto"',
        setIndex: 1,
        weightKg: null,
        note: 'nota; con "comillas"\ny salto',
      },
    ]);
    const line = csv.trim().split('\r\n')[1];
    expect(line).toBe('2026-01-05 09:30;"A;1";"Remo ""alto""";1;;"nota; con ""comillas"" y salto"');
  });
});

describe('buildCsvRowsFromExport', () => {
  it('incluye solo entrenamientos completados', () => {
    const data: CsvExportData = {
      sessions: [
        { id: 's1', status: 'completed', completed_at: day1, routine_name: 'A' },
        { id: 's2', status: 'active', completed_at: null, routine_name: 'B' },
      ],
      sessionExercises: [
        { id: 'se1', session_id: 's1', exercise_name: 'Sentadilla', note: 'buen día' },
        { id: 'se2', session_id: 's2', exercise_name: 'Remo', note: '' },
      ],
      setLogs: [
        { id: 'l1', session_exercise_id: 'se1', set_index: 1, weight_kg: 80 },
        { id: 'l2', session_exercise_id: 'se1', set_index: 2, weight_kg: 82.5 },
        { id: 'l3', session_exercise_id: 'se2', set_index: 1, weight_kg: 40 },
      ],
    };

    const rows = buildCsvRowsFromExport(data);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      routineName: 'A',
      exerciseName: 'Sentadilla',
      setIndex: 1,
      weightKg: 80,
      note: 'buen día',
    });
    expect(rows[1]).toMatchObject({ setIndex: 2, weightKg: 82.5 });
  });
});
