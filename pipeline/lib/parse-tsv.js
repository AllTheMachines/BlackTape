import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// MusicBrainz PostgreSQL COPY format parser.
// Rules:
//   - Tab-separated columns
//   - \N means NULL
//   - Backslash escapes: \\ → \, \t → tab, \n → newline
//   - No quoting — raw values between tabs
//   - Rows terminated by newline

function unescapeValue(val) {
  if (val === '\\N') return null;
  if (!val.includes('\\')) return val;

  let result = '';
  for (let i = 0; i < val.length; i++) {
    if (val[i] === '\\' && i + 1 < val.length) {
      const next = val[i + 1];
      if (next === '\\') { result += '\\'; i++; }
      else if (next === 'n') { result += '\n'; i++; }
      else if (next === 't') { result += '\t'; i++; }
      else { result += next; i++; }
    } else {
      result += val[i];
    }
  }
  return result;
}

/**
 * Parse a single TSV line into an object keyed by column names.
 * @param {string} line - Raw TSV line
 * @param {string[]} columns - Column names from table definition
 * @returns {Object} Parsed row with column names as keys, nulls for \N
 */
export function parseLine(line, columns) {
  const parts = line.split('\t');
  const row = {};
  for (let i = 0; i < columns.length; i++) {
    row[columns[i]] = i < parts.length ? unescapeValue(parts[i]) : null;
  }
  return row;
}

/**
 * Stream-parse a TSV file, yielding parsed row objects.
 * @param {string} filePath - Path to the TSV file
 * @param {string[]} columns - Column names from table definition
 * @param {function} onRow - Callback for each parsed row
 * @param {function} [onProgress] - Optional callback with rows processed count
 * @param {number} [progressInterval=50000] - How often to call onProgress
 * @returns {Promise<number>} Total rows processed
 */
export async function parseFile(filePath, columns, onRow, onProgress, progressInterval = 50000) {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let count = 0;
  for await (const line of rl) {
    if (!line) continue;
    const row = parseLine(line, columns);
    onRow(row);
    count++;
    if (onProgress && count % progressInterval === 0) {
      onProgress(count);
    }
  }
  return count;
}
