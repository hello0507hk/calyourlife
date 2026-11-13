/** Shared chart id helpers — safe for client and server (no Redis). */

export function chartIdFromBirth(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: string;
  longitude: number;
}) {
  const lon = Number(input.longitude).toFixed(2);
  return `c_${input.year}${String(input.month).padStart(2, '0')}${String(input.day).padStart(2, '0')}_${String(input.hour).padStart(2, '0')}${String(input.minute).padStart(2, '0')}_${input.gender}_${lon}`;
}
