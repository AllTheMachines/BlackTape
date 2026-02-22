/**
 * Code-level checks — no browser needed.
 * Tests file existence, grep patterns, and build output.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = path.resolve(import.meta.dirname, '../../..');

export function fileExists(relPath) {
  return () => fs.existsSync(path.join(ROOT, relPath));
}

export function fileContains(relPath, pattern) {
  return () => {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) return false;
    const content = fs.readFileSync(abs, 'utf8');
    return typeof pattern === 'string'
      ? content.includes(pattern)
      : pattern.test(content);
  };
}

export function anyFileContains(glob, pattern) {
  return () => {
    const { globSync } = createRequire(import.meta.url)('glob');
    const files = globSync(glob, { cwd: ROOT, absolute: true });
    return files.some(f => {
      try {
        const content = fs.readFileSync(f, 'utf8');
        return typeof pattern === 'string'
          ? content.includes(pattern)
          : pattern.test(content);
      } catch { return false; }
    });
  };
}
