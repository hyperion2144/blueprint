/**
 * Prepare script — runs on npm install (cross-platform).
 *
 * 1. Compile PEG grammars (.peggy -> .cjs) if peggy is available
 * 2. Bundle with tsup (clean: true wipes bin/)
 * 3. Copy grammar .cjs files to bin/grammar/
 * 4. Copy cli.js -> bp.js
 */
import { execSync } from 'node:child_process';
import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const grammarSrc = join(root, 'src', 'core', 'validate', 'grammar');
const binDir = join(root, 'bin');
const grammarDest = join(binDir, 'grammar');

// Step 1: Compile grammars (best-effort)
try {
  const files = readdirSync(grammarSrc).filter(f => f.endsWith('.peggy'));
  for (const f of files) {
    const cjsPath = join(grammarSrc, f.replace(/\.peggy$/, '.cjs'));
    execSync(`npx peggy -o "${cjsPath}" --format commonjs "${join(grammarSrc, f)}"`, {
      cwd: root,
      stdio: 'pipe',
    });
    console.log(`compile ${f}`);
  }
} catch {
  console.log('grammar compilation skipped');
}

// Step 2: Bundle with tsup (wipes bin/ via clean: true)
try {
  execSync('npx tsup', { cwd: root, stdio: 'pipe' });
  console.log('tsup bundle OK');
} catch {
  console.log('tsup bundling failed');
  process.exit(1);
}

// Step 3: Copy grammar .cjs files to bin/grammar/ (AFTER tsup, so clean: true doesn't wipe them)
mkdirSync(grammarDest, { recursive: true });
let copied = 0;
for (const f of readdirSync(grammarSrc)) {
  if (f.endsWith('.cjs')) {
    copyFileSync(join(grammarSrc, f), join(grammarDest, f));
    copied++;
  }
}
console.log(`copied ${copied} grammar files`);

// Step 4: Copy cli.js -> bp.js
copyFileSync(join(binDir, 'cli.js'), join(binDir, 'bp.js'));
console.log('prepare complete');
