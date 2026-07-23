/**
 * e2e: bp update + generated Extension session_start [T-43]
 *
 * Spins up a fake OMP runtime against the actual Extension source generated
 * by `bp update`. The fixture mirrors the Blueprint repo's own bp/specs and
 * bp/conventions so the assertions cover the production path set.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
const repoRoot = process.cwd();

let testDir: string;

function writeRel(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

/** Recursively list every regular file under `src`, returning paths relative to `src`. */
function listFiles(src: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(src)) {
    const full = join(src, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      for (const nested of listFiles(full)) {
        out.push(join(entry, nested));
      }
    } else if (st.isFile()) {
      out.push(entry);
    }
  }
  return out;
}
// ---------------------------------------------------------------------------
// Fake OMP Extension API
// ---------------------------------------------------------------------------

interface BpMessage {
  role: 'custom';
  customType: string;
  content: Array<{ type: 'text'; text: string }>;
  timestamp: number;
}

interface FakeApi {
  api: {
    on(event: string, handler: (event: unknown, ctx: unknown) => unknown): void;
    sendMessage(msg: BpMessage): void;
  };
  sent: BpMessage[];
  invoke(event: string, eventData?: unknown, ctx?: unknown): Promise<unknown>;
}

function makeFakeApi(): FakeApi {
  const sent: BpMessage[] = [];
  const handlers: Record<string, (event: unknown, ctx: unknown) => unknown> = {};
  return {
    api: {
      on(event, handler) {
        handlers[event] = handler;
      },
      sendMessage(msg) {
        sent.push(msg);
      },
    },
    sent,
    invoke: async (event, eventData = {}, ctx = {}) => {
      const handler = handlers[event];
      if (!handler) return undefined;
      return handler(eventData, ctx);
    },
  };
}

// ---------------------------------------------------------------------------
// Fixture setup: bp init + mirror production specs/conventions + bp update
// ---------------------------------------------------------------------------

describe('e2e: bp-context-injection (generated Extension runtime)', () => {
  let bpExtension: (api: FakeApi['api']) => void;
let origPath: string | undefined;

  beforeAll(async () => {
    testDir = join(tmpdir(), `bp-e2e-ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(testDir, { recursive: true });

    // (a) Run `bp init` against the temp dir to scaffold bp/ + initial platform files
    execSync(`node "${cliPath}" init --dir "${testDir}" --yes`, {
      encoding: 'utf-8',
      cwd: testDir,
    });

    // (b) Mirror the production bp/specs and bp/conventions into the fixture
    //     so the e2e covers the real path set, not a hand-rolled subset.
    cpSync(join(repoRoot, 'bp', 'specs'), join(testDir, 'bp', 'specs'), {
      recursive: true,
    });
    cpSync(join(repoRoot, 'bp', 'conventions'), join(testDir, 'bp', 'conventions'), {
      recursive: true,
    });

    // (c) Add a demo change with context.jsonl so executor/reviewer paths can fire.
    writeRel('bp/changes/demo/proposal.md', '# Demo change\n\n## Intent\ne2e fixture\n');
    writeRel(
      'bp/changes/demo/tasks.md',
      '# Demo tasks\n\n## Acceptance\n- T-1: spec paths covered\n- T-2: extension emits bp-context block\n',
    );
    writeRel(
      'bp/changes/demo/context.jsonl',
      [
        JSON.stringify({ file: 'bp/specs/init/spec.md', reason: 'inv-A', phase: 'all' }),
        JSON.stringify({
          file: 'bp/specs/platform-gen/spec.md',
          reason: 'inv-B',
          phase: 'all',
          tag: 'guard-rail',
        }),
      ].join('\n') + '\n',
    );

    // (d2) Write a proper roadmap so bp state --json can derive M1.
    writeRel(
      'bp/roadmap.md',
      '## Milestone: M1 - Test Milestone [ACTIVE]\n\n' +
      '**Goal**: e2e test suite.\n' +
      '**Status**: ACTIVE\n\n' +
      '### Phase: P1.1 - Test Phase [ACTIVE]\n\n' +
      '- **Goal**: Phase goal\n' +
      '- **Changes**: 0/0 completed\n' +
      '- **Status**: ACTIVE\n\n' +
      '**Changes**:\n' +
      '- [ ] demo (proposed)\n' +
      '\n**Next**: Phase P1.2\n',
    );

    // (d) Run `bp update` to regenerate the Extension + shim in the fixture.
    execSync(`node "${cliPath}" update --dir bp`, { encoding: 'utf-8', cwd: testDir });
    // Ensure `bp` CLI is in PATH for the generated Extension's execSync calls.
    // Create a bp symlink in node_modules/.bin so `bp` is found regardless of global install
    try {
      const binDir = join(process.cwd(), 'node_modules', '.bin');
      const bpLink = join(binDir, 'bp');
      if (!existsSync(bpLink)) symlinkSync(cliPath, bpLink);
    } catch { /* non-fatal — may already exist */ }
    origPath = process.env.PATH;
    process.env.PATH = origPath + ':' + join(process.cwd(), 'node_modules', '.bin');

    // (e) Read + import the freshly generated Extension.
    const extPath = join(testDir, '.omp', 'extensions', 'bp', 'index.ts');
    expect(existsSync(extPath)).toBe(true);
    const mod = await import(extPath);
    expect(typeof mod.default).toBe('function');
    bpExtension = mod.default;
  }, 60_000);

  afterAll(() => {
    process.env.PATH = origPath;
    if (testDir) rmSync(testDir, { recursive: true, force: true });
  });

  it('step 1: generated Extension source contains every expected handler + env bypass', () => {
    const extPath = join(testDir, '.omp', 'extensions', 'bp', 'index.ts');
    const src = readFileSync(extPath, 'utf-8');
    expect(src).toContain('export default function bpExtension(api)');
    expect(src).toContain('api.on("session_start"');
    expect(src).toContain('api.on("before_agent_start"');
    expect(src).toContain('api.on("context"');
    expect(src).toContain('BP_HOOKS');
    expect(src).toContain('BP_DISABLE_HOOKS');
    expect(src).toContain('hasBpConfig');
    expect(src).toContain('detectAgentType');
  });

  it('step 2: session_start default emits a real <bp-context> block with paths', async () => {
    const fake = makeFakeApi();
    bpExtension(fake.api);
    await fake.invoke('session_start', {}, { cwd: testDir });

    expect(fake.sent).toHaveLength(1);
    const msg = fake.sent[0];
    expect(msg.role).toBe('custom');
    expect(msg.customType).toBe('bp-context');
    expect(typeof msg.timestamp).toBe('number');
    const text = msg.content[0].text;
    expect(text).toContain('<bp-context>');
    expect(text).toContain('</bp-context>');
    // ensure this is a REAL compact output, not the old placeholder
    expect(text).not.toContain('bp context --format=compact');
    expect(text).toContain('specs/');
  });

  it('step 3: the bp context --format=compact output covers every spec domain and both conventions', () => {
    // The Extension emits a marker that instructs the agent to call
    // `bp context --format=compact` for the full payload. Run that command
    // here and verify it covers every production path.
    const output = execSync(`node "${cliPath}" context plan --format=compact`, {
      encoding: 'utf-8',
      cwd: testDir,
    });
    expect(output).toContain('<bp-context>');
    expect(output).toContain('</bp-context>');

    // Every spec domain from the Blueprint repo must be present. The
    // <bp-context> block renders paths relative to bp/, so strip the
    // leading `bp/` when matching.
    const specDirs = listFiles(join(repoRoot, 'bp', 'specs'))
      .filter((p) => p.endsWith('spec.md'))
      .map((p) => `specs/${p}`);
    expect(specDirs.length).toBeGreaterThan(0);
    for (const specPath of specDirs) {
      expect(output).toContain(specPath);
    }

    // Both production convention files must be present.
    const conventionFiles = listFiles(join(repoRoot, 'bp', 'conventions')).map(
      (p) => `conventions/${p}`,
    );
    expect(conventionFiles.length).toBeGreaterThanOrEqual(2);
    for (const convPath of conventionFiles) {
      expect(output).toContain(convPath);
    }
  });

  it('step 4: planner session_start appends ## Roadmap State section [sub-agent discrimination]', async () => {
    const fake = makeFakeApi();
    bpExtension(fake.api);
    await fake.invoke(
      'session_start',
      {},
      {
        cwd: testDir,
        agentTemplate: 'bp-planner-v2',
        activeChangeName: 'demo',
      },
    );
    expect(fake.sent).toHaveLength(1);
    const text = fake.sent[0].content[0].text;
    expect(text).toContain('## Roadmap State');
    expect(text).toContain('Active: demo');
    // planner branch must NOT include executor/reviewer augmentation
    expect(text).not.toContain('> GUARD-RAIL:');
    expect(text).not.toContain('## Invariants');
  });

  it('step 5: executor session_start inlines every context.jsonl row with guard-rail prefix [sub-agent discrimination]', async () => {
    const fake = makeFakeApi();
    bpExtension(fake.api);
    await fake.invoke(
      'session_start',
      {},
      {
        cwd: testDir,
        agentTemplate: 'bp-executor-v2',
        activeChangeName: 'demo',
      },
    );
    expect(fake.sent).toHaveLength(1);
    const text = fake.sent[0].content[0].text;
    // every context.jsonl row's file: + reason: must be present
    expect(text).toContain('bp/specs/init/spec.md');
    expect(text).toContain('inv-A');
    expect(text).toContain('bp/specs/platform-gen/spec.md');
    expect(text).toContain('inv-B');
    // guard-rail rows are prefixed with `> GUARD-RAIL:`
    expect(text).toContain('> GUARD-RAIL: file: bp/specs/platform-gen/spec.md');
    // executor branch must NOT include planner/reviewer augmentation
    expect(text).not.toContain('## Roadmap State');
    expect(text).not.toContain('## Invariants');
  });

  it('step 6: reviewer session_start lists each row reason under ## Invariants and appends tasks.md verbatim [sub-agent discrimination]', async () => {
    const fake = makeFakeApi();
    bpExtension(fake.api);
    await fake.invoke(
      'session_start',
      {},
      {
        cwd: testDir,
        agentTemplate: 'bp-reviewer-v2',
        activeChangeName: 'demo',
      },
    );
    expect(fake.sent).toHaveLength(1);
    const text = fake.sent[0].content[0].text;
    expect(text).toContain('## Invariants');
    // each row's `reason` rendered as a bullet
    expect(text).toContain('- inv-A');
    expect(text).toContain('- inv-B');
    // tasks.md acceptance appended verbatim
    expect(text).toContain('T-1: spec paths covered');
    expect(text).toContain('T-2: extension emits bp-context block');
    // reviewer branch must NOT include planner/executor augmentation
    expect(text).not.toContain('## Roadmap State');
    expect(text).not.toContain('> GUARD-RAIL:');
  });

  it('step 7: before_agent_start returns a bp-workflow-state custom message derived from bp state', async () => {
    const fake = makeFakeApi();
    bpExtension(fake.api);
    const result = (await fake.invoke('before_agent_start', {}, { cwd: testDir })) as
      | { message?: BpMessage }
      | undefined;
    expect(result).toBeDefined();
    expect(result?.message).toBeDefined();
    expect(result!.message!.customType).toBe('bp-workflow-state');
    expect(result!.message!.role).toBe('custom');
    expect(typeof result!.message!.timestamp).toBe('number');
    expect(result!.message!.content[0].text).toContain('M1:');
    expect(result!.message!.content[0].text).toContain('Next');
  });

  it('step 8: context handler returns undefined when no compaction occurred', async () => {
    const fake = makeFakeApi();
    bpExtension(fake.api);
    const result = await fake.invoke('context', {}, { cwd: testDir });
    expect(result).toBeUndefined();
  });

  it('step 9: context handler re-injects workflow state after compaction when no recent bp-workflow-state exists', async () => {
    const fake = makeFakeApi();
    bpExtension(fake.api);
    const result = (await fake.invoke(
      'context',
      {},
      {
        cwd: testDir,
        lastCompactionTs: 999,
        lastInjectionTs: 100,
        recentMessages: [{ customType: 'bp-context' }],
      },
    )) as { message?: BpMessage } | undefined;
    expect(result).toBeDefined();
    expect(result?.message?.customType).toBe('bp-workflow-state');
    expect(result!.message!.content[0].text).toContain('M1:');
  });

  it('step 10: BP_HOOKS=0 short-circuits every handler', async () => {
    const prev = process.env.BP_HOOKS;
    process.env.BP_HOOKS = '0';
    try {
      const fake = makeFakeApi();
      bpExtension(fake.api);
      await fake.invoke('session_start', {}, { cwd: testDir });
      await fake.invoke('before_agent_start', {}, { cwd: testDir });
      await fake.invoke('context', {}, { cwd: testDir, lastCompactionTs: 999, lastInjectionTs: 0 });
      expect(fake.sent).toHaveLength(0);
    } finally {
      if (prev === undefined) delete process.env.BP_HOOKS;
      else process.env.BP_HOOKS = prev;
    }
  });
});