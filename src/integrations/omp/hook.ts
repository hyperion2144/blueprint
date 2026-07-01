/**
 * bp OMP Hook — automated spec injection and workflow guidance.
 *
 * Install: copy to .omp/hooks/pre/bp-hook.ts
 * Or generate via: bp update (writes to .omp/hooks/pre/bp.ts)
 *
 * Pattern: Trellis-style context injection.
 * - SessionStart: detect bp project, inject specs + conventions + workflow state
 * - BeforeAgentStart: remind agent of current step's constraints
 * - PreToolUse (task): inject sub-agent context from change directory
 *
 * Reference: Trellis context-injection.md — inject the right files at the right time.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

interface HookAPI {
  on(event: string, handler: (event: any, ctx: any) => any): void;
  sendMessage(msg: any, opts?: any): void;
}

export default function bpHook(api: HookAPI): void {
  // ── SessionStart: inject project specs + workflow state ──
  api.on("session_start", async (_event: any, ctx: any) => {
    const cwd = ctx.cwd ?? process.cwd();
    if (!existsSync(join(cwd, "bp", "state.md"))) return;

    try {
      // Run bp context to get full state + specs + conventions
      const output = execSync("bp context current", {
        cwd,
        encoding: "utf-8",
        timeout: 5000,
      });
      const data = JSON.parse(output);

      const lines: string[] = [];
      lines.push(`[bp] Project: ${data.project} | Status: ${data.status}`);
      if (data.milestone) lines.push(`Milestone: ${data.milestone}`);
      if (data.phase) lines.push(`Phase: ${data.phase}`);

      // Inject specs content
      if (data.specs?.length) {
        lines.push("\n─── Specs ───");
        for (const spec of data.specs) {
          if (spec.content) {
            lines.push(`\n### ${spec.path}\n${spec.content.slice(0, 4096)}`);
          }
        }
      }

      // Inject conventions content
      if (data.conventions?.length) {
        lines.push("\n─── Conventions ───");
        for (const conv of data.conventions) {
          if (conv.content) {
            lines.push(`\n### ${conv.path}\n${conv.content.slice(0, 2048)}`);
          }
        }
      }

      api.sendMessage({
        role: "custom",
        customType: "bp-session",
        content: [{ type: "text", text: lines.join("\n") }],
        timestamp: Date.now(),
      });
    } catch {
      // bp CLI not available — skip injection
    }
  });

  // ── BeforeAgentStart: workflow-state hint ──
  api.on("before_agent_start", async (_event: any, ctx: any) => {
    const cwd = ctx.cwd ?? process.cwd();
    if (!existsSync(join(cwd, "bp", "state.md"))) return;

    try {
      const output = execSync("bp state", { cwd, encoding: "utf-8", timeout: 3000 });
      const state = JSON.parse(output);

      const pending = state.pending || [];
      const hint = pending.length > 0
        ? `[bp] Pending: ${pending.map((p: any) => `${p.name}[${p.status}]`).join(", ")}. Run \`bp continue\` to advance.`
        : `[bp] Status: ${state.status}. Run \`bp continue\` to check next step.`;

      ctx.ui?.setStatus?.("bp", hint);
    } catch {
      // skip
    }
  });
}
