/**
 * Generates and triggers download of a CSV file from recorded session data.
 * @param {Array} dataBuffer - Array of {time, sp, fb, err, out} objects.
 */
export function downloadCSV(dataBuffer) {
  if (!dataBuffer || dataBuffer.length === 0) {
    console.warn('No data to export.');
    return;
  }

  const header = 'Time_ms,Setpoint_Deg,Feedback_Deg,Error,PWM_Output\n';
  const rows = dataBuffer
    .map((d) => `${d.time.toFixed(2)},${d.sp},${d.fb},${d.err},${d.out}`)
    .join('\n');

  const csvContent = header + rows;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);

  const link = document.createElement('a');
  link.href = url;
  link.download = `PID_Session_${timestamp}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses a CSV line from PIC: "sp,fb,err,out"
 * @param {string} line - Raw CSV string
 * @returns {object|null} Parsed data object or null if invalid.
 */
export function parseCSVLine(line) {
  const parts = line.split(',');
  if (parts.length < 4) return null;

  const sp = parseInt(parts[0], 10);
  const fb = parseInt(parts[1], 10);
  const err = parseInt(parts[2], 10);
  const out = parseInt(parts[3], 10);

  if ([sp, fb, err, out].some(isNaN)) return null;

  return { sp, fb, err, out };
}
