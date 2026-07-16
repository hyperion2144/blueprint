/**
 * Prepare script - runs on npm install (cross-platform).
 *
 * v2: No PEG grammar compilation (removed in v2).
 * 1. Bundle with tsup (clean: true wipes bin/)
 * 2. Copy cli.js -> bp.js
 */
import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const binDir = join(root, 'bin');

// Step 1: Bundle with tsup (wipes bin/ via clean: true)
try {
  execSync('npx tsup', { cwd: root, stdio: 'pipe' });
  console.log('tsup bundle OK');
} catch {
  console.log('tsup bundling failed');
  process.exit(1);
}

// Step 2: Copy cli.js -> bp.js
copyFileSync(join(binDir, 'cli.js'), join(binDir, 'bp.js'));
console.log('prepare complete');
