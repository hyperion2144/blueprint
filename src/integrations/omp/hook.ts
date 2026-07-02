/**
 * bp OMP Hook — automated workflow state injection.
 *
 * Install: copy to .omp/hooks/pre/bp-hook.ts
 * Or generate via: bp update (writes to .omp/hooks/pre/bp.ts)
 *
 * SessionStart: inject workflow state summary only.
 *   Specs/conventions are injected on-demand by `bp context <step>`.
 * BeforeAgentStart: remind agent of current step's pending work.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

interface HookAPI {
  on(event: string, handler: (event: unknown, ctx: unknown) => unknown): void;
  sendMessage(msg: unknown, opts?: unknown): void;
}

export default function bpHook(api: HookAPI): void {
  // ── SessionStart: inject project state summary ──
  api.on("session_start", async (_event: unknown, ctx: unknown) => {
    const cwd = (ctx as Record<string, unknown> | null)?.cwd;
    const workDir = typeof cwd === "string" ? cwd : process.cwd();
    if (!existsSync(join(workDir, "bp", "state.md"))) return;

    try {
      const output = execSync("bp state", {
        cwd: workDir,
        encoding: "utf-8",
        timeout: 5000,
      });
      const state = JSON.parse(output) as {
        project?: string;
        status?: string;
        milestone?: string | null;
        phase?: string | null;
      };

      const lines: string[] = [];
      lines.push(`[bp] Project: ${state.project ?? "-"} | Status: ${state.status ?? "-"}`);
      if (state.milestone) lines.push(`Milestone: ${state.milestone}`);
      if (state.phase) lines.push(`Phase: ${state.phase}`);
      lines.push("Run `bp context <step>` for specs/conventions injection.");

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
  api.on("before_agent_start", async (_event: unknown, ctx: unknown) => {
    const cwd = (ctx as Record<string, unknown> | null)?.cwd;
    const workDir = typeof cwd === "string" ? cwd : process.cwd();
    if (!existsSync(join(workDir, "bp", "state.md"))) return;

    try {
      const output = execSync("bp state", { cwd: workDir, encoding: "utf-8", timeout: 3000 });
      const state = JSON.parse(output) as {
        pending?: Array<{ name: string; status: string }>;
        status?: string;
      };

      const pending = state.pending ?? [];
      const hint = pending.length > 0
        ? `[bp] Pending: ${pending.map((p) => `${p.name}[${p.status}]`).join(", ")}. Run \`bp continue\` to advance.`
        : `[bp] Status: ${state.status ?? "-"}. Run \`bp continue\` to check next step.`;

      const ui = (ctx as Record<string, unknown> | null)?.ui;
      if (ui && typeof ui === "object" && "setStatus" in ui) {
        const setStatus = (ui as { setStatus: (label: string, value: string) => void }).setStatus;
        setStatus("bp", hint);
      }
    } catch {
      // skip
    }
  });
}
