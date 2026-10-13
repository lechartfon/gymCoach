const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** "lun 5 ene 2026" */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "2026-01-05 09:30" en hora local, ideal para CSV */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "1:30" o "1:05:00" redondeando hacia arriba al segundo */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

/** Duración legible entre dos marcas de tiempo */
export function formatDurationMs(ms: number): string {
  if (ms < 60_000) {
    return 'menos de 1 min';
  }
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }
  return `${totalMinutes} min`;
}

/** "40" o "42.5" */
export function formatWeight(kg: number | null): string {
  if (kg === null) {
    return '—';
  }
  if (Number.isInteger(kg)) {
    return String(kg);
  }
  return kg.toFixed(1);
}

/** Acepta coma o punto decimal. Devuelve null si no es un número válido. */
export function parseWeight(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') {
    return null;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

/** Acepta solo enteros >= 0. Devuelve null si no es válido. */
export function parsePositiveInt(text: string, max = 100000): number | null {
  const normalized = text.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  if (value > max) {
    return null;
  }
  return value;
}
