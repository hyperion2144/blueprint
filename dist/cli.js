#!/usr/bin/env node

// src/cli.ts
import { program } from "commander";

// src/commands/specwf-init.ts
import { join as join5 } from "path";

// src/core/config.ts
import { join } from "path";
import { existsSync } from "fs";
import { z } from "zod";

// src/parser/yaml.ts
import { readFileSync, writeFileSync } from "fs";
import { parse, parseDocument } from "yaml";
function readYamlDoc(path) {
  return parseDocument(readFileSync(path, "utf-8"));
}
function writeYamlDoc(path, doc) {
  writeFileSync(path, String(doc), "utf-8");
}

// src/types/config.ts
var PROFILE_MODEL_MAP = {
  lite: {
    research: "default",
    plan: "default",
    execute: "default",
    review: "default",
    verify: "default",
    archive: "smol"
  },
  standard: {
    research: "slow",
    plan: "slow",
    execute: "default",
    review: "slow",
    verify: "default",
    archive: "default"
  },
  strict: {
    research: "slow:high",
    plan: "slow:high",
    execute: "slow",
    review: "slow:high",
    verify: "slow",
    archive: "default"
  }
};

// src/core/config.ts
import { Document as Document2 } from "yaml";
var CONFIG_FILE = "project.yml";
var ProjectConfigSchema = z.object({
  version: z.number(),
  platform: z.array(z.string()),
  profile: z.enum(["lite", "standard", "strict"]),
  context: z.string(),
  workflow: z.object({
    research: z.boolean().optional(),
    plan_check: z.boolean().optional(),
    tdd: z.boolean().optional(),
    triple_review: z.boolean().optional(),
    auto_advance: z.boolean().optional(),
    spec_injection: z.boolean().optional()
  }).optional().default({}),
  review: z.object({
    gate: z.enum(["all-pass", "severity", "report-only"]).optional(),
    parallel: z.boolean().optional()
  }).optional().default({}),
  change: z.object({
    parallel: z.enum(["serial", "dependency-graph", "pipeline"]).optional(),
    isolation: z.boolean().optional()
  }).optional().default({}),
  git: z.object({
    branching: z.enum(["none", "phase", "milestone"]).optional(),
    create_tag: z.boolean().optional()
  }).optional().default({}),
  conventions: z.object({
    inject: z.boolean().optional().default(true)
  }).optional().default({ inject: true }),
  models: z.record(z.string(), z.string()).optional().default({})
});
function configPath(specwfDir) {
  return join(specwfDir, CONFIG_FILE);
}
function loadConfig(specwfDir) {
  const doc = readYamlDoc(configPath(specwfDir));
  const raw = doc.toJS();
  return ProjectConfigSchema.parse(raw);
}
function saveConfig(specwfDir, config) {
  let doc;
  if (existsSync(configPath(specwfDir))) {
    doc = readYamlDoc(configPath(specwfDir));
  } else {
    doc = new Document2({});
  }
  doc.set("version", config.version);
  doc.set("platform", config.platform);
  doc.set("profile", config.profile);
  doc.set("context", config.context);
  if (config.workflow) doc.set("workflow", config.workflow);
  if (config.review) doc.set("review", config.review);
  if (config.change) doc.set("change", config.change);
  if (config.git) doc.set("git", config.git);
  if (config.conventions) doc.set("conventions", config.conventions);
  if (config.models) doc.set("models", config.models);
  writeYamlDoc(configPath(specwfDir), doc);
}
function updateConfig(specwfDir, updater) {
  const config = loadConfig(specwfDir);
  updater(config);
  saveConfig(specwfDir, config);
}
function resolveModels(config) {
  const profile = config.profile;
  const defaults = PROFILE_MODEL_MAP[profile];
  return { ...defaults, ...config.models };
}

// src/core/file-tree.ts
import { mkdirSync, existsSync as existsSync2, readdirSync, statSync } from "fs";
import { join as join2 } from "path";
import { renameSync } from "fs";
var SPECWF_DIRS = [
  "specs",
  "conventions",
  "research",
  "milestones",
  "changes",
  "archive",
  "workspace"
];
function createSpecwfStructure(specwfDir) {
  mkdirSync(specwfDir, { recursive: true });
  for (const dir of SPECWF_DIRS) {
    mkdirSync(join2(specwfDir, dir), { recursive: true });
  }
}
function isInitialized(specwfDir) {
  return existsSync2(join2(specwfDir, "project.yml")) && existsSync2(join2(specwfDir, "state.md"));
}
function createAdhocChangeDir(specwfDir, changeName) {
  const dir = join2(specwfDir, "changes", changeName);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join2(dir, "specs"), { recursive: true });
  return dir;
}
function archiveChangeDir(specwfDir, changeDir) {
  const changeName = changeDir.split("/").pop() ?? "unknown";
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const archiveDir = join2(specwfDir, "archive", `${date}-${changeName}`);
  if (existsSync2(changeDir)) {
    renameSync(changeDir, archiveDir);
  }
  return archiveDir;
}
function listMilestones(specwfDir) {
  const dir = join2(specwfDir, "milestones");
  if (!existsSync2(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join2(dir, e));
    return stat.isDirectory();
  });
}
function listPhases(specwfDir, milestoneId) {
  const dir = join2(specwfDir, "milestones", milestoneId, "phases");
  if (!existsSync2(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join2(dir, e));
    return stat.isDirectory();
  });
}
function listChanges(specwfDir, milestoneId, phaseId) {
  const dir = join2(specwfDir, "milestones", milestoneId, "phases", phaseId, "changes");
  if (!existsSync2(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join2(dir, e));
    return stat.isDirectory();
  });
}
function listAdhocChanges(specwfDir) {
  const dir = join2(specwfDir, "changes");
  if (!existsSync2(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join2(dir, e));
    return stat.isDirectory();
  });
}
function listArchived(specwfDir) {
  const dir = join2(specwfDir, "archive");
  if (!existsSync2(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join2(dir, e));
    return stat.isDirectory();
  });
}

// src/core/state-file.ts
import { join as join3 } from "path";
import { z as z2 } from "zod";

// src/parser/frontmatter.ts
import matter from "gray-matter";
import { readFileSync as readFileSync3 } from "fs";
function parseFrontmatter(content) {
  const parsed = matter(content);
  return {
    data: parsed.data,
    content: parsed.content
  };
}
function stringifyFrontmatter(data, body) {
  return matter.stringify(body, data);
}
function readFrontmatterFile(path) {
  return parseFrontmatter(readFileSync3(path, "utf-8"));
}

// src/core/state-file.ts
import { writeFileSync as writeFileSync3, existsSync as existsSync3 } from "fs";
var STATE_FILE = "state.md";
var ChangeStateSchema = z2.object({
  name: z2.string(),
  status: z2.string(),
  depends_on: z2.array(z2.string()).optional().default([])
});
var StateFileSchema = z2.object({
  project: z2.object({
    name: z2.string(),
    status: z2.string(),
    current_milestone: z2.string().nullable(),
    current_phase: z2.string().nullable()
  }),
  active_context: z2.object({
    type: z2.enum(["project", "milestone", "phase", "change", "adhoc"]),
    ref: z2.string().nullable(),
    step: z2.string()
  }),
  changes: z2.array(ChangeStateSchema).optional().default([]),
  adhoc: z2.array(ChangeStateSchema).optional().default([])
});
function statePath(specwfDir) {
  return join3(specwfDir, STATE_FILE);
}
function loadState(specwfDir) {
  const result = readFrontmatterFile(statePath(specwfDir));
  return StateFileSchema.parse(result.data);
}
function saveState(specwfDir, state) {
  const body = generateStateBody(state);
  const output = stringifyFrontmatter(state, body);
  writeFileSync3(statePath(specwfDir), output, "utf-8");
}
function updateState(specwfDir, updater) {
  const state = loadState(specwfDir);
  updater(state);
  saveState(specwfDir, state);
}
function generateStateBody(state) {
  const ctx = state.active_context;
  const lines = [
    "# State",
    "",
    "## \u5F53\u524D\u4F4D\u7F6E",
    "",
    formatContext(state),
    "",
    "## \u72B6\u6001\u673A",
    "",
    "\u9879\u76EE\u5C42\u8DEF\u5F84: `initialized \u2192 requirements-defined \u2192 researched \u2192 roadmap-defined`",
    ""
  ];
  if (state.project) {
    lines.push("## \u5386\u53F2", "");
  }
  return lines.join("\n");
}
function formatContext(state) {
  const { type, ref, step } = state.active_context;
  switch (type) {
    case "project":
      return `\u9879\u76EE\u5C42 \u2014 ${step}\u3002`;
    case "milestone":
      return `Milestone ${state.project.current_milestone ?? "?"} \u2014 ${step}\u3002`;
    case "phase":
      return `Phase ${state.project.current_phase ?? "?"} \u2014 ${step}\u3002`;
    case "change":
      return `Change (${ref ?? "?"}) \u2014 ${step}\u3002`;
    case "adhoc":
      return `\u4E34\u65F6 Change (${ref ?? "?"}) \u2014 ${step}\u3002`;
    default:
      return step;
  }
}

// src/prompts/init-wizard.ts
async function runInitWizard(defaults) {
  if (defaults.yes) {
    return { profile: defaults.profile, context: "", platform: ["omp"], brownfield: false };
  }
  try {
    const clack = await import("@clack/prompts");
    const val = await clack.select({
      message: "\u9009\u62E9\u5DE5\u4F5C\u6D41\u4E25\u683C\u5EA6:",
      options: [{ value: "lite", label: "Lite" }, { value: "standard", label: "Standard\uFF08\u63A8\u8350\uFF09" }, { value: "strict", label: "Strict" }],
      initialValue: defaults.profile
    });
    const profile = typeof val === "string" ? val : defaults.profile;
    const ctxVal = await clack.text({ message: "\u9879\u76EE\u4E0A\u4E0B\u6587\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09:", placeholder: "\u6280\u672F\u6808: TypeScript, Node.js..." });
    const context = typeof ctxVal === "string" ? ctxVal : "";
    const pfVal = await clack.multiselect({ message: "\u9009\u62E9\u76EE\u6807\u5E73\u53F0:", options: [{ value: "omp", label: "Oh My Pi" }], initialValues: ["omp"] });
    const platform = Array.isArray(pfVal) ? pfVal : ["omp"];
    const bfVal = await clack.confirm({ message: "\u8FD9\u662F\u4E00\u4E2A\u5B58\u91CF\u9879\u76EE\u5417\uFF1F", initialValue: false });
    const brownfield = typeof bfVal === "boolean" ? bfVal : false;
    return { profile, context, platform, brownfield };
  } catch {
    console.log("(@clack/prompts \u672A\u5B89\u88C5\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u914D\u7F6E)");
    return { profile: defaults.profile, context: "", platform: ["omp"], brownfield: false };
  }
}

// src/core/brownfield.ts
import { readFileSync as readFileSync5, readdirSync as readdirSync2, existsSync as existsSync4, writeFileSync as writeFileSync4, mkdirSync as mkdirSync2 } from "fs";
import { join as join4 } from "path";
function detectProjectInfo(rootDir) {
  const info = {
    type: "unknown",
    language: "unknown",
    framework: "unknown",
    hasPackageJson: false,
    hasTests: false,
    srcDirs: [],
    structFiles: []
  };
  if (existsSync4(join4(rootDir, "package.json"))) {
    info.hasPackageJson = true;
    info.type = "node";
    info.language = "typescript";
    try {
      const pkg = JSON.parse(readFileSync5(join4(rootDir, "package.json"), "utf-8"));
      if (pkg.dependencies?.next) info.framework = "next.js";
      else if (pkg.dependencies?.react) info.framework = "react";
      else if (pkg.dependencies?.vue) info.framework = "vue";
      else if (pkg.dependencies?.express) info.framework = "express";
      else if (pkg.dependencies?.fastify) info.framework = "fastify";
    } catch {
    }
  }
  if (existsSync4(join4(rootDir, "Cargo.toml"))) {
    info.type = "rust";
    info.language = "rust";
  }
  if (existsSync4(join4(rootDir, "go.mod"))) {
    info.type = "go";
    info.language = "go";
  }
  for (const dir of ["src", "app", "lib", "pkg", "cmd"]) {
    if (existsSync4(join4(rootDir, dir)) && readdirSync2(join4(rootDir, dir), { withFileTypes: true }).some((e) => e.isDirectory())) {
      info.srcDirs.push(dir);
    }
  }
  if (existsSync4(join4(rootDir, "__tests__")) || existsSync4(join4(rootDir, "tests"))) {
    info.hasTests = true;
  }
  if (existsSync4(join4(rootDir, "vitest.config.ts")) || existsSync4(join4(rootDir, "jest.config.ts"))) {
    info.hasTests = true;
  }
  return info;
}
function generateCodebaseReport(rootDir, info) {
  const stack = buildStackSection(info);
  const structure = buildStructureSection(rootDir);
  const conventions = detectConventions(rootDir);
  return { stack, structure, conventions };
}
function buildStackSection(info) {
  return `# \u6280\u672F\u6808

- \u9879\u76EE\u7C7B\u578B: ${info.type}
- \u8BED\u8A00: ${info.language}
- \u6846\u67B6: ${info.framework}
- src \u76EE\u5F55: ${info.srcDirs.join(", ")}
- \u6D4B\u8BD5: ${info.hasTests ? "\u6709" : "\u65E0"}
`;
}
function buildStructureSection(rootDir) {
  const lines = ["# \u9879\u76EE\u7ED3\u6784", ""];
  try {
    const entries = readdirSync2(rootDir, { withFileTypes: true }).filter((e) => !e.name.startsWith(".") && !e.name.startsWith("node_modules") && e.name !== "dist").map((e) => `${e.isDirectory() ? "  [dir]  " : "  [file] "}${e.name}`).slice(0, 30);
    lines.push(...entries);
  } catch {
  }
  return lines.join("\n");
}
function detectConventions(rootDir) {
  const configs = [];
  if (existsSync4(join4(rootDir, "tsconfig.json"))) configs.push("TypeScript");
  if (existsSync4(join4(rootDir, ".eslintrc.js")) || existsSync4(join4(rootDir, "eslint.config.js"))) configs.push("ESLint");
  if (existsSync4(join4(rootDir, ".prettierrc"))) configs.push("Prettier");
  return `# \u9879\u76EE\u7EA6\u5B9A

\u68C0\u6D4B\u5230: ${configs.length > 0 ? configs.join(", ") : "\u65E0"}`;
}
function bootstrapSpecs(rootDir, specwfDir) {
  const specs = [];
  if (existsSync4(join4(rootDir, "src"))) {
    try {
      for (const entry of readdirSync2(join4(rootDir, "src"), { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.name.startsWith("_")) {
          const domainDir = join4(specwfDir, "specs", entry.name);
          mkdirSync2(domainDir, { recursive: true });
          writeFileSync4(
            join4(domainDir, "spec.md"),
            `# ${entry.name} Specification

## Purpose

[\u4ECE\u4E0A\u4F4D\u4EE3\u7801\u81EA\u52A8\u63D0\u53D6\u7684\u521D\u59CB spec \u2014 \u5F85\u4EBA\u5DE5\u5BA1\u6838]

## Requirements

`,
            "utf-8"
          );
          specs.push(entry.name);
        }
      }
    } catch {
    }
  }
  if (specs.length === 0) {
    const domainDir = join4(specwfDir, "specs", "general");
    mkdirSync2(domainDir, { recursive: true });
    writeFileSync4(
      join4(domainDir, "spec.md"),
      `# General Specification

## Purpose

[\u4ECE\u4E0A\u4F4D\u4EE3\u7801\u81EA\u52A8\u63D0\u53D6\u7684\u521D\u59CB spec \u2014 \u5F85\u4EBA\u5DE5\u5BA1\u6838]

## Requirements

`,
      "utf-8"
    );
    specs.push("general");
  }
  return specs;
}
async function runBrownfieldInit(rootDir, specwfDir, info) {
  const report = generateCodebaseReport(rootDir, info);
  const researchDir = join4(specwfDir, "research", "codebase");
  mkdirSync2(researchDir, { recursive: true });
  writeFileSync4(join4(researchDir, "stack.md"), report.stack, "utf-8");
  writeFileSync4(join4(researchDir, "structure.md"), report.structure, "utf-8");
  writeFileSync4(join4(researchDir, "conventions.md"), report.conventions, "utf-8");
  const domains = bootstrapSpecs(rootDir, specwfDir);
  return domains;
}

// src/commands/specwf-init.ts
function register(program2) {
  program2.command("init").description("\u521D\u59CB\u5316 specwf \u9879\u76EE\u7ED3\u6784").option("--dir <path>", "\u76EE\u6807\u76EE\u5F55", ".").option("--profile <profile>", "\u5DE5\u4F5C\u6D41\u4E25\u683C\u5EA6 (lite|standard|strict)", "standard").option("--brownfield", "\u5B58\u91CF\u9879\u76EE\u6A21\u5F0F\uFF08codebase mapping + spec bootstrap\uFF09").option("--yes", "\u8DF3\u8FC7\u786E\u8BA4\u4F7F\u7528\u9ED8\u8BA4\u503C").action(initHandler);
}
async function initHandler(options) {
  const baseDir = options.dir.startsWith("/") ? options.dir : join5(process.cwd(), options.dir);
  const specwfDir = join5(baseDir, "specwf");
  if (isInitialized(specwfDir)) {
    console.error("specwf \u5DF2\u521D\u59CB\u5316\u3002\u8FD0\u884C `specwf update` \u66F4\u65B0\u5E73\u53F0\u6587\u4EF6\u3002");
    process.exit(1);
  }
  const wizard = await runInitWizard({ profile: options.profile, yes: options.yes });
  const profile = wizard.profile;
  const platform = wizard.platform;
  const isBrownfield = options.brownfield || wizard.brownfield;
  createSpecwfStructure(specwfDir);
  console.log("\u2713 \u521B\u5EFA specwf/ \u76EE\u5F55\u7ED3\u6784");
  saveConfig(specwfDir, {
    version: 1,
    platform,
    profile,
    context: wizard.context,
    workflow: {},
    review: {},
    change: {},
    git: { branching: "none", create_tag: true },
    conventions: { inject: true },
    models: {}
  });
  console.log("\u2713 \u521B\u5EFA project.yml (profile: " + profile + ")");
  saveState(specwfDir, {
    project: {
      name: baseDir.split("/").pop() || "project",
      status: "initialized",
      current_milestone: null,
      current_phase: null
    },
    active_context: {
      type: "project",
      ref: null,
      step: "init"
    },
    changes: [],
    adhoc: []
  });
  console.log("\u2713 \u521B\u5EFA state.md");
  if (isBrownfield) {
    const info = detectProjectInfo(process.cwd());
    const domains = await runBrownfieldInit(process.cwd(), specwfDir, info);
    console.log("\u2713 \u5B58\u91CF\u9879\u76EE codebase mapping \u5B8C\u6210 (" + domains.length + " \u4E2A spec \u57DF)");
  }
  console.log("specwf \u521D\u59CB\u5316\u5B8C\u6210\u3002\u8FD0\u884C `specwf update` \u751F\u6210\u5E73\u53F0\u6587\u4EF6\u3002");
}

// src/commands/specwf-update.ts
import { join as join9 } from "path";

// src/generators/omp-commands.ts
import { readFileSync as readFileSync6 } from "fs";
import { join as join6, dirname } from "path";
import { fileURLToPath } from "url";
var STEP_DEFS = [
  { step: "init", name: "specwf:init", description: "\u521D\u59CB\u5316 specwf \u9879\u76EE\u7ED3\u6784", usesAgent: true, agents: ["researcher"] },
  { step: "grill", name: "specwf:grill", description: "\u9700\u6C42\u63A2\u8BA8 \u2014 \u65E0\u9650\u5236\u7EC6\u8282\u63D0\u95EE\u76F4\u5230\u8FBE\u6210\u5171\u8BC6", usesAgent: false, agents: [] },
  { step: "research", name: "specwf:research", description: "\u9879\u76EE\u6280\u672F\u8C03\u7814 \u2014 \u5E76\u884C\u591A\u65B9\u5411\u8C03\u7814", usesAgent: true, agents: ["researcher"] },
  { step: "roadmap", name: "specwf:roadmap", description: "\u8DEF\u7EBF\u56FE \u2014 \u62C6\u5206 Milestone \xD7 Phase", usesAgent: false, agents: [] },
  { step: "milestone", name: "specwf:milestone", description: "\u91CC\u7A0B\u7891\u7BA1\u7406 \u2014 \u5207\u6362/\u521B\u5EFA Milestone", usesAgent: false, agents: [] },
  { step: "discuss", name: "specwf:discuss", description: "Phase \u8BA8\u8BBA \u2014 \u6355\u83B7\u5B9E\u73B0\u51B3\u7B56", usesAgent: false, agents: [] },
  { step: "research-phase", name: "specwf:research-phase", description: "Phase \u8C03\u7814 \u2014 \u5B9E\u73B0\u8DEF\u5F84\u7814\u7A76", usesAgent: true, agents: ["researcher"] },
  { step: "split", name: "specwf:split", description: "Change \u62C6\u5206 \u2014 \u4F9D\u8D56\u56FE + N \u4E2A Change", usesAgent: false, agents: [] },
  { step: "adhoc", name: "specwf:adhoc", description: "\u4E34\u65F6 Change \u2014 \u4E0E milestone/phase \u65E0\u5173\u7684\u72EC\u7ACB\u53D8\u66F4", usesAgent: false, agents: [] },
  { step: "plan", name: "specwf:plan", description: "Change \u8BBE\u8BA1 \u2014 design+tasks+delta-specs", usesAgent: true, agents: ["planner"] },
  { step: "apply", name: "specwf:apply", description: "\u4EE3\u7801\u5B9E\u73B0 \u2014 TDD RED\u2192GREEN\u2192REFACTOR", usesAgent: true, agents: ["executor"] },
  { step: "review", name: "specwf:review", description: "\u4E09\u91CD\u5BA1\u67E5 \u2014 \u89C4\u683C/\u8D28\u91CF/\u76EE\u6807\u5E76\u884C", usesAgent: true, agents: ["reviewer"] },
  { step: "verify", name: "specwf:verify", description: "\u6D4B\u8BD5\u9A8C\u8BC1 \u2014 \u8BCA\u65AD+\u8DEF\u7531\u56DE\u73AF", usesAgent: true, agents: ["verifier"] },
  { step: "archive", name: "specwf:archive", description: "\u5F52\u6863 \u2014 delta \u5408\u5E76 + \u4EE3\u7801\u8BA4\u77E5\u56DE\u704C", usesAgent: false, agents: [] },
  { step: "ship", name: "specwf:ship", description: "\u4EA4\u4ED8 \u2014 PR + STATE \u66F4\u65B0 / release tag", usesAgent: false, agents: [] },
  { step: "continue", name: "specwf:continue", description: "\u81EA\u52A8\u63A8\u8FDB \u2014 \u8BFB STATE \u786E\u5B9A\u4E0B\u4E00\u6B65", usesAgent: false, agents: [] }
];
var __dirname = dirname(fileURLToPath(import.meta.url));
var TEMPLATES_DIR = join6(__dirname, "templates", "commands");
function loadTemplate(step) {
  return readFileSync6(join6(TEMPLATES_DIR, `${step}.md`), "utf-8");
}
function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
function generateSlashCommand(def, config) {
  const body = def.bodyOverride ?? loadAndRenderTemplate(def);
  return `---
name: ${def.name}
description: ${def.description}
---

${body}
`;
}
function loadAndRenderTemplate(def) {
  try {
    return renderTemplate(loadTemplate(def.step), {
      step: def.step,
      description: def.description,
      usesAgent: String(def.usesAgent),
      agents: def.agents.join(", ")
    });
  } catch {
    return fallbackBody(def);
  }
}
function fallbackBody(def) {
  const agentsSection = def.usesAgent && def.agents.length > 0 ? `\u8C03\u7528 task \u5DE5\u5177 fan-out \`specwf-${def.agents[0]}\` agent\u3002` : "\u672C\u6B65\u9AA4\u4E0D\u4F7F\u7528\u5B50\u4EE3\u7406\u3002";
  return `# \u5DE5\u4F5C\u6D41: ${def.description}

## 1. \u89D2\u8272\u5B9A\u4E49

\u672C\u6B65\u9AA4\u8D1F\u8D23\u6267\u884C\u6807\u51C6\u7684 specwf \u5DE5\u4F5C\u6D41\u64CD\u4F5C\u3002
- **\u4EA7\u51FA**\uFF1A\u6309\u7167 specwf \u6807\u51C6\u6D41\u7A0B\u6267\u884C

## 2. \u524D\u7F6E\u6761\u4EF6

- state.md \u72B6\u6001\u6B63\u786E
- \u524D\u7F6E\u6B65\u9AA4\u5DF2\u5168\u90E8\u5B8C\u6210

## 3. \u6267\u884C\u6B65\u9AA4

\`\`\`bash
# \u83B7\u53D6\u4E0A\u4E0B\u6587
specwf context ${def.step} $@

# \u6267\u884C\u6B65\u9AA4\u547D\u4EE4
specwf ${def.step}
\`\`\`

## 4. \u5B50\u4EE3\u7406\u4F7F\u7528

${agentsSection}

## 5. \u4EA7\u7269\u7BA1\u7406

\`\`\`bash
specwf state
specwf config
\`\`\`

## 6. \u9A8C\u8BC1

\`\`\`bash
specwf state
\`\`\`

## 7. \u4E0B\u4E00\u6B65

\`\`\`bash
specwf continue
\`\`\`
`;
}
function generateAllCommands(config) {
  return STEP_DEFS.map((def) => ({
    path: `.omp/commands/specwf-${def.step}.md`,
    content: generateSlashCommand(def, config)
  }));
}

// src/generators/omp-agents.ts
import { readFileSync as readFileSync7 } from "fs";
import { join as join7, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __dirname2 = dirname2(fileURLToPath2(import.meta.url));
var TEMPLATES_DIR2 = join7(__dirname2, "templates", "agents");
function loadTemplate2(role) {
  return readFileSync7(join7(TEMPLATES_DIR2, `${role}.md`), "utf-8");
}
function renderTemplate2(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
var AGENT_DEFS = [
  // ====================================================================
  // specwf-researcher
  // ====================================================================
  {
    role: "researcher",
    description: "\u6280\u672F\u8C03\u7814\uFF1A\u4EA7\u51FA STACK/ARCH/PITFALLS/RESEARCH \u6587\u6863",
    tools: ["read", "grep", "glob", "lsp", "web_search", "write", "bash"],
    spawns: "*"
  },
  // ====================================================================
  // specwf-planner
  // ====================================================================
  {
    role: "planner",
    description: "Change \u8BBE\u8BA1\uFF1A\u4EA7\u51FA proposal/design/tasks/delta-specs",
    tools: ["read", "grep", "glob", "lsp", "write", "bash"],
    spawns: "*"
  },
  // ====================================================================
  // specwf-executor
  // ====================================================================
  {
    role: "executor",
    description: "\u4EE3\u7801\u5B9E\u73B0\uFF1ATDD RED\u2192GREEN\u2192REFACTOR",
    tools: ["read", "edit", "write", "bash", "grep", "glob", "lsp", "ast_grep", "ast_edit"],
    spawns: "*"
  },
  // ====================================================================
  // specwf-reviewer
  // ====================================================================
  {
    role: "reviewer",
    description: "\u4E09\u91CD\u5BA1\u67E5\uFF1A\u89C4\u683C\u5BA1\u67E5 + \u8D28\u91CF\u5BA1\u67E5 + \u76EE\u6807\u5BA1\u67E5",
    tools: ["read", "grep", "glob", "lsp", "ast_grep", "bash"],
    spawns: "*"
  },
  // ====================================================================
  // specwf-verifier
  // ====================================================================
  {
    role: "verifier",
    description: "\u6D4B\u8BD5\u9A8C\u8BC1\uFF1A\u8BCA\u65AD + \u8DEF\u7531\u56DE\u73AF",
    tools: ["read", "bash", "grep", "glob", "lsp", "edit", "write"],
    spawns: "*"
  },
  // ====================================================================
  // specwf-archiver
  // ====================================================================
  {
    role: "archiver",
    description: "\u5F52\u6863\uFF1Adelta-spec \u5408\u5E76 + \u4EE3\u7801\u8BA4\u77E5\u56DE\u704C",
    tools: ["read", "grep", "glob", "write", "bash", "edit"],
    spawns: "*"
  }
];
function resolveAgentModel(role, config) {
  const models = resolveModels(config);
  const key = role;
  return models[key] ?? "default";
}
function resolveThinkingLevel(role) {
  const levelMap = {
    researcher: "high",
    planner: "high",
    executor: "medium",
    reviewer: "high",
    verifier: "medium",
    archiver: "medium"
  };
  return levelMap[role] ?? "medium";
}
function generateAgent(def, model) {
  const thinkingLevel = resolveThinkingLevel(def.role);
  const body = renderTemplate2(loadTemplate2(def.role), {
    role: def.role,
    description: def.description,
    tools: def.tools.map((t) => `  - ${t}`).join("\n"),
    model,
    spawns: def.spawns
  });
  return `---
name: specwf-${def.role}
description: ${def.description}
tools:
${def.tools.map((t) => `  - ${t}`).join("\n")}
model: ${model}
thinkingLevel: ${thinkingLevel}
spawns: "${def.spawns}"
blocking: false
autoloadSkills: false
readSummarize: true
---

${body}
`;
}
function generateAllAgents(config) {
  return AGENT_DEFS.map((def) => ({
    path: `.omp/agents/specwf-${def.role}.md`,
    content: generateAgent(def, resolveAgentModel(def.role, config))
  }));
}

// src/generators/skills.ts
import { readFileSync as readFileSync8 } from "fs";
import { join as join8, dirname as dirname3 } from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
var __dirname3 = dirname3(fileURLToPath3(import.meta.url));
var TEMPLATES_DIR3 = join8(__dirname3, "templates", "skills");
function loadTemplate3(step) {
  return readFileSync8(join8(TEMPLATES_DIR3, `${step}.md`), "utf-8");
}
function renderTemplate3(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
function skillName(step) {
  return `specwf-${step}`;
}
function skillDescription(step) {
  const map = {
    init: "\u521D\u59CB\u5316 specwf \u9879\u76EE\u7ED3\u6784\uFF0C\u751F\u6210\u5E73\u53F0\u6587\u4EF6",
    grill: "\u9700\u6C42\u63A2\u8BA8 \u2014 \u65E0\u9650\u5236\u7EC6\u8282\u63D0\u95EE\u76F4\u5230\u8FBE\u6210\u5171\u8BC6",
    research: "\u9879\u76EE\u6280\u672F\u8C03\u7814 \u2014 \u5E76\u884C\u591A\u65B9\u5411\u8C03\u7814",
    roadmap: "\u8DEF\u7EBF\u56FE \u2014 \u62C6\u5206 Milestone \xD7 Phase",
    milestone: "\u91CC\u7A0B\u7891\u7BA1\u7406 \u2014 \u5207\u6362/\u521B\u5EFA Milestone\uFF0C\u8BBE\u7F6E\u5F53\u524D\u9636\u6BB5",
    discuss: "Phase \u8BA8\u8BBA \u2014 \u6355\u83B7\u5B9E\u73B0\u51B3\u7B56\uFF0C\u5F62\u6210 context.md",
    "research-phase": "Phase \u8C03\u7814 \u2014 \u5B9E\u73B0\u8DEF\u5F84\u7814\u7A76",
    split: "Change \u62C6\u5206 \u2014 \u4F9D\u8D56\u56FE + N \u4E2A Change",
    adhoc: "\u521B\u5EFA\u4E34\u65F6 Change \u2014 \u4E0E\u9636\u6BB5\u65E0\u5173\u7684\u72EC\u7ACB\u53D8\u66F4",
    plan: "Change \u8BBE\u8BA1 \u2014 \u6280\u672F\u65B9\u6848 + \u4EFB\u52A1\u62C6\u5206 + delta-specs",
    apply: "\u4EE3\u7801\u5B9E\u73B0 \u2014 TDD RED\u2192GREEN\u2192REFACTOR",
    review: "\u4E09\u91CD\u5BA1\u67E5 \u2014 \u89C4\u683C\u5BA1\u67E5/\u8D28\u91CF\u5BA1\u67E5/\u76EE\u6807\u5BA1\u67E5\u5E76\u884C",
    verify: "\u6D4B\u8BD5\u9A8C\u8BC1 \u2014 \u8BCA\u65AD\u6839\u56E0 + \u8DEF\u7531\u56DE\u73AF",
    archive: "\u5F52\u6863 \u2014 delta-spec \u5408\u5E76 + \u4EE3\u7801\u8BA4\u77E5\u56DE\u704C",
    ship: "\u4EA4\u4ED8 \u2014 PR + STATE \u66F4\u65B0 / release tag",
    continue: "\u81EA\u52A8\u63A8\u8FDB \u2014 \u8BFB STATE \u786E\u5B9A\u4E0B\u4E00\u6B65\u5E76\u89E6\u53D1\u5BF9\u5E94\u547D\u4EE4"
  };
  return map[step] ?? "";
}
var STEPS = ["init", "grill", "research", "roadmap", "milestone", "discuss", "research-phase", "split", "adhoc", "plan", "apply", "review", "verify", "archive", "ship", "continue"];
var SKILL_DEFS = STEPS.map((step) => ({
  step,
  name: skillName(step),
  description: skillDescription(step)
}));
function generateSkill(def) {
  const body = renderTemplate3(loadTemplate3(def.step), { step: def.step, description: def.description });
  return `---
name: ${def.name}
description: ${def.description}
hide: false
---

${body}
`;
}
function generateAllSkills(config) {
  return SKILL_DEFS.map((def) => ({
    path: `.omp/skills/specwf-${def.step}/SKILL.md`,
    content: generateSkill(def)
  }));
}

// src/generators/index.ts
function generateAll(config) {
  return [
    ...generateAllCommands(config),
    ...generateAllAgents(config),
    ...generateAllSkills(config)
  ];
}

// src/commands/_utils.ts
import { mkdirSync as mkdirSync3, writeFileSync as writeFileSync5 } from "fs";
function writeGeneratedFiles(files) {
  for (const file of files) {
    const dir = file.path.split("/").slice(0, -1).join("/");
    if (dir) mkdirSync3(dir, { recursive: true });
    writeFileSync5(file.path, file.content, "utf-8");
    console.log(`  \u2713 ${file.path}`);
  }
}

// src/commands/specwf-update.ts
function register2(program2) {
  program2.command("update").description("\u66F4\u65B0\u5E73\u53F0\u6587\u4EF6\uFF08commands + agents\uFF09").option("--dir <path>", "specwf \u76EE\u5F55", "specwf").action(updateHandler);
}
function updateHandler(options) {
  const specwfDir = join9(process.cwd(), options.dir);
  const config = loadConfig(specwfDir);
  const files = generateAll(config);
  console.log("\u6B63\u5728\u66F4\u65B0\u5E73\u53F0\u6587\u4EF6...");
  writeGeneratedFiles(files);
  console.log(`\u2713 \u66F4\u65B0\u5B8C\u6210 (${files.length} \u4E2A\u6587\u4EF6)`);
}

// src/commands/specwf-config.ts
import { join as join10 } from "path";
function register3(program2) {
  const cmd = program2.command("config").description("\u67E5\u770B/\u4FEE\u6539\u914D\u7F6E\u9879\u76EE");
  cmd.command("list").description("\u67E5\u770B\u5F53\u524D\u914D\u7F6E").action(configList);
  cmd.command("set <key> <value>").description("\u4FEE\u6539\u914D\u7F6E\u9879").action(configSet);
  cmd.action(configList);
}
function configList(options, cmd) {
  if (cmd?.parent?.args?.length > 1) return;
  const specwfDir = findSpecwfDir();
  const config = loadConfig(specwfDir);
  console.log(JSON.stringify(config, null, 2));
}
function configSet(key, value) {
  const specwfDir = findSpecwfDir();
  updateConfig(specwfDir, (config) => {
    const parts = key.split(".");
    let target = config;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    const typedValue = parseTypedValue(value);
    target[lastKey] = typedValue;
  });
  console.log(`\u2713 ${key} = ${value}`);
}
function parseTypedValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (value === "null") return null;
  return value;
}
function findSpecwfDir() {
  return join10(process.cwd(), "specwf");
}

// src/commands/specwf-state.ts
import { join as join11 } from "path";
function register4(program2) {
  const cmd = program2.command("state").description("\u67E5\u770B/\u4FEE\u6539\u5F53\u524D\u72B6\u6001");
  cmd.command("show").description("\u67E5\u770B\u5F53\u524D\u72B6\u6001").action(showState);
  cmd.command("set-milestone <id>").description("\u5207\u6362\u5230\u6307\u5B9A milestone").action(setMilestone);
  cmd.command("set-phase <id>").description("\u5207\u6362\u5230\u6307\u5B9A phase").action(setPhase);
  cmd.command("set-step <step>").description("\u8BBE\u7F6E\u5F53\u524D\u6B65\u9AA4").action(setStep);
  cmd.action(showState);
}
function findSpecwfDir2() {
  return join11(process.cwd(), "specwf");
}
function showState() {
  const specwfDir = findSpecwfDir2();
  const state = loadState(specwfDir);
  const { project, active_context } = state;
  console.log("\u2500".repeat(50));
  console.log(`\u9879\u76EE: ${project.name}`);
  console.log(`\u72B6\u6001: ${project.status}`);
  console.log(`Milestone: ${project.current_milestone ?? "(\u65E0)"}`);
  console.log(`Phase: ${project.current_phase ?? "(\u65E0)"}`);
  console.log(`\u5F53\u524D\u7C7B\u578B: ${active_context.type}`);
  console.log(`\u5F53\u524D\u6B65\u9AA4: ${active_context.step}`);
  if (active_context.ref) {
    console.log(`\u5F15\u7528: ${active_context.ref}`);
  }
  console.log("\u2500".repeat(50));
}
function setMilestone(id) {
  const specwfDir = findSpecwfDir2();
  updateState(specwfDir, (state) => {
    state.project.current_milestone = id;
    state.project.current_phase = null;
    state.active_context.type = "phase";
    state.active_context.ref = `milestones/${id}`;
    state.active_context.step = "discuss";
    state.project.status = "phase-discuss";
  });
  console.log(`\u2713 \u5207\u6362\u5230 milestone: ${id}\uFF08\u72B6\u6001: phase-discuss\uFF09`);
  console.log("\u2192 \u4E0B\u4E00\u6B65: /specwf:discuss");
}
function setPhase(id) {
  const specwfDir = findSpecwfDir2();
  updateState(specwfDir, (state) => {
    state.project.current_phase = id;
    state.active_context.type = "phase";
    state.active_context.ref = `milestones/${state.project.current_milestone ?? "?"}/phases/${id}`;
    state.active_context.step = "discuss";
    state.project.status = "phase-discuss";
  });
  console.log(`\u2713 \u5207\u6362\u5230 phase: ${id}\uFF08\u72B6\u6001: phase-discuss\uFF09`);
  console.log("\u2192 \u4E0B\u4E00\u6B65: /specwf:discuss");
}
function setStep(step) {
  const specwfDir = findSpecwfDir2();
  updateState(specwfDir, (state) => {
    state.active_context.step = step;
  });
  console.log(`\u2713 \u5F53\u524D\u6B65\u9AA4: ${step}`);
}

// src/commands/specwf-context.ts
import { join as join13 } from "path";

// src/core/spec-injector.ts
import { join as join12 } from "path";
import { readdirSync as readdirSync3, existsSync as existsSync6, statSync as statSync2 } from "fs";
var PROJECT_STEPS = ["init", "grill", "research", "roadmap"];
var PHASE_STEPS = ["discuss", "research-phase", "split"];
var CHANGE_STEPS = ["plan", "apply", "review", "verify", "archive"];
function isProjectStep(step) {
  return PROJECT_STEPS.includes(step);
}
function isPhaseStep(step) {
  return PHASE_STEPS.includes(step);
}
function isChangeStep(step) {
  return CHANGE_STEPS.includes(step);
}
function generateContext(specwfDir, step) {
  const state = loadState(specwfDir);
  const ctx = state.active_context;
  const result = {
    step,
    scope: { type: ctx.type, ref: ctx.ref },
    specs: [],
    conventions: [],
    changeArtifacts: [],
    requirements: []
  };
  result.conventions = getAllConventions(specwfDir);
  if (existsSync6(join12(specwfDir, "requirements.md"))) {
    result.requirements.push({ path: "requirements.md", description: "\u9700\u6C42\u89C4\u683C" });
  }
  if (isProjectStep(step)) {
    result.specs = getAllSpecs(specwfDir);
  } else if (isPhaseStep(step)) {
    result.specs = getRelatedSpecs(specwfDir, state);
  } else if (isChangeStep(step)) {
    result.specs = getRelatedSpecs(specwfDir, state);
    result.changeArtifacts = getChangeArtifacts(specwfDir, state);
  }
  return result;
}
function getAllSpecs(specwfDir) {
  const specsDir = join12(specwfDir, "specs");
  return listSpecFiles(specsDir, "specs");
}
function getRelatedSpecs(specwfDir, state) {
  const allSpecs = getAllSpecs(specwfDir);
  if (allSpecs.length === 0) return [];
  const ref = state.active_context.ref ?? "";
  const changeName = ref.split("/").pop() ?? "";
  const related = allSpecs.filter((spec) => {
    const domain = spec.path.split("/")[1] ?? "";
    return changeName.toLowerCase().includes(domain.toLowerCase());
  });
  return related.length > 0 ? related : allSpecs;
}
function getAllConventions(specwfDir) {
  const convDir = join12(specwfDir, "conventions");
  if (!existsSync6(convDir)) return [];
  return readdirSync3(convDir).filter((f) => f.endsWith(".md")).map((f) => ({ path: `conventions/${f}`, description: "\u9879\u76EE\u7EA6\u5B9A" }));
}
function getChangeArtifacts(specwfDir, state) {
  const ref = state.active_context.ref;
  if (!ref) return [];
  const changeDir = join12(specwfDir, ref);
  if (!existsSync6(changeDir)) return [];
  const artifacts = [];
  for (const file of ["proposal.md", "design.md", "tasks.md", ".specwf.yaml"]) {
    const fullPath = join12(changeDir, file);
    if (existsSync6(fullPath)) {
      artifacts.push({ path: `${ref}/${file}`, description: "change \u4EA7\u7269" });
    }
  }
  const specsDir = join12(changeDir, "specs");
  if (existsSync6(specsDir)) {
    const deltaSpecs = listSpecFiles(specsDir, `${ref}/specs`);
    artifacts.push(...deltaSpecs);
  }
  return artifacts;
}
function listSpecFiles(dir, prefix) {
  if (!existsSync6(dir)) return [];
  const results = [];
  for (const entry of readdirSync3(dir)) {
    const fullPath = join12(dir, entry);
    const stat = statSync2(fullPath);
    if (stat.isDirectory()) {
      results.push(...listSpecFiles(fullPath, `${prefix}/${entry}`));
    } else if (entry.endsWith(".md")) {
      results.push({ path: `${prefix}/${entry}`, description: "\u884C\u4E3A\u5951\u7EA6" });
    }
  }
  return results;
}
function formatContextTerminal(result) {
  const lines = [
    `=== specwf context for step: ${result.step} ===`,
    `Scope: ${result.scope.type}${result.scope.ref ? ` (${result.scope.ref})` : ""}`,
    "\u2500".repeat(60)
  ];
  if (result.specs.length > 0) {
    lines.push("Related specs:");
    for (const spec of result.specs) {
      lines.push(`  ${spec.path.padEnd(40)} # ${spec.description ?? ""}`);
    }
    lines.push("");
  }
  if (result.conventions.length > 0) {
    lines.push("Related conventions:");
    for (const conv of result.conventions) {
      lines.push(`  ${conv.path.padEnd(40)} # ${conv.description ?? ""}`);
    }
    lines.push("");
  }
  if (result.changeArtifacts.length > 0) {
    lines.push("Current change artifacts:");
    for (const art of result.changeArtifacts) {
      lines.push(`  ${art.path}`);
    }
    lines.push("");
  }
  if (result.requirements.length > 0) {
    lines.push("Requirements:");
    for (const req of result.requirements) {
      lines.push(`  ${req.path}`);
    }
    lines.push("");
  }
  lines.push("\u2500".repeat(60));
  lines.push("Usage: use `read <path>` to load each file.");
  lines.push("Selectors: `read <path>:50-100` for ranges.");
  return lines.join("\n");
}

// src/commands/specwf-context.ts
function register5(program2) {
  program2.command("context <step>").description("\u8F93\u51FA\u5F53\u524D\u6B65\u9AA4\u4E0A\u4E0B\u6587\u6587\u4EF6\u6E05\u5355").option("--json", "JSON \u683C\u5F0F\u8F93\u51FA").action(contextHandler);
}
function contextHandler(step, options) {
  const specwfDir = join13(process.cwd(), "specwf");
  const result = generateContext(specwfDir, step);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatContextTerminal(result));
  }
}

// src/commands/specwf-continue.ts
import { join as join14 } from "path";

// src/types/state.ts
var STATE_TRANSITIONS = [
  // 项目层路径
  { from: "initialized", command: "grill", to: "requirements-defined", slashCommand: "/specwf:grill" },
  { from: "requirements-defined", command: "research", to: "researching", slashCommand: "/specwf:research", subagent: true },
  { from: "researching", command: "research-done", to: "researched", slashCommand: "" },
  { from: "researched", command: "roadmap", to: "roadmap-defined", slashCommand: "/specwf:roadmap" },
  { from: "roadmap-defined", command: "discuss", to: "phase-discuss", slashCommand: "/specwf:discuss" },
  // Phase 路径
  { from: "phase-discuss", command: "research-phase", to: "phase-research", slashCommand: "/specwf:research-phase", subagent: true },
  { from: "phase-research", command: "split", to: "phase-split", slashCommand: "/specwf:split" },
  { from: "phase-split", command: "plan", to: "change-planning", slashCommand: "/specwf:plan", subagent: true },
  { from: "change-planning", command: "apply", to: "change-applying", slashCommand: "/specwf:apply", subagent: true },
  { from: "change-applying", command: "review", to: "change-reviewing", slashCommand: "/specwf:review", subagent: true },
  { from: "change-reviewing", command: "verify", to: "change-verifying", slashCommand: "/specwf:verify", subagent: true },
  { from: "change-verifying", command: "archive", to: "change-archiving", slashCommand: "/specwf:archive" },
  { from: "change-archiving", command: "archive-done", to: "change-archived", slashCommand: "" },
  // 回环
  { from: "change-verifying", command: "replan", to: "change-planning", slashCommand: "/specwf:plan", subagent: true },
  { from: "change-verifying", command: "reapply", to: "change-applying", slashCommand: "/specwf:apply", subagent: true },
  { from: "change-reviewing", command: "fix", to: "change-applying", slashCommand: "/specwf:apply", subagent: true },
  // Ship
  { from: "change-archived", command: "ship-phase", to: "phase-shipped", slashCommand: "/specwf:ship" },
  { from: "phase-shipped", command: "next-phase", to: "phase-discuss", slashCommand: "/specwf:discuss" },
  { from: "phase-shipped", command: "ship-milestone", to: "milestone-shipped", slashCommand: "/specwf:ship" },
  // 临时 change
  { from: "adhoc-proposal", command: "plan", to: "change-planning", slashCommand: "/specwf:plan", subagent: true }
];

// src/core/state-machine.ts
function getNextSteps(from) {
  return STATE_TRANSITIONS.filter((t) => t.from === from);
}

// src/core/continue.ts
function determineNextStep(specwfDir) {
  return determineFromState(loadState(specwfDir));
}
function determineFromState(state) {
  const ctx = state.active_context;
  const currentStatus = resolveStatus(state);
  const available = getNextSteps(currentStatus);
  const availableSteps = available.map((t) => ({
    command: t.command,
    slashCommand: t.slashCommand,
    subagent: t.subagent ?? false
  }));
  const first = available[0];
  const hint = available.length === 0 ? generateHint(state) : null;
  return {
    currentStep: ctx.step,
    context: formatContext2(state),
    nextCommand: first?.command ?? null,
    slashCommand: first?.slashCommand || null,
    needsSubagent: first?.subagent ?? false,
    availableSteps,
    hint
  };
}
function resolveStatus(state) {
  const ctx = state.active_context;
  switch (ctx.type) {
    case "project":
      return state.project.status;
    case "milestone":
      return state.project.status === "milestone-shipped" ? "milestone-shipped" : "milestone-active";
    case "phase":
      return `phase-${ctx.step}`;
    case "change":
      return `change-${ctx.step}`;
    case "adhoc":
      return `adhoc-${ctx.step}`;
    default:
      return state.project.status;
  }
}
function formatContext2(state) {
  const { type, ref, step } = state.active_context;
  switch (type) {
    case "project":
      return `\u9879\u76EE\u5C42 \u2014 ${step}`;
    case "milestone":
      return `Milestone ${state.project.current_milestone ?? "?"} \u2014 ${step}`;
    case "phase":
      return `Phase ${state.project.current_phase ?? "?"} \u2014 ${step}`;
    case "change":
      return `Change (${ref ?? "?"}) \u2014 ${step}`;
    case "adhoc":
      return `\u4E34\u65F6 Change (${ref ?? "?"}) \u2014 ${step}`;
    default:
      return step;
  }
}
function generateHint(state) {
  const status = state.project.status;
  if (status === "milestone-shipped") {
    return "\u5F53\u524D milestone \u5DF2\u5B8C\u6210\u3002\u521B\u5EFA\u65B0 milestone: specwf state set-milestone <id>";
  }
  if (status === "phase-shipped") {
    return "\u5F53\u524D phase \u5DF2\u5B8C\u6210\u3002\u521B\u5EFA\u65B0 phase \u6216\u5207\u6362: specwf state set-milestone <id>";
  }
  return null;
}

// src/commands/specwf-continue.ts
function register6(program2) {
  program2.command("continue").description("\u81EA\u52A8\u63A8\u8FDB\u5230\u4E0B\u4E00\u6B65\uFF08\u8BFB state.md \u2192 \u786E\u5B9A\u4E0B\u4E00\u6B65 \u2192 \u8F93\u51FA\uFF09").action(continueHandler);
}
function continueHandler() {
  const specwfDir = join14(process.cwd(), "specwf");
  const result = determineNextStep(specwfDir);
  console.log("\u2500".repeat(50));
  console.log(`\u5F53\u524D\u4F4D\u7F6E: ${result.context}`);
  console.log(`\u5F53\u524D\u6B65\u9AA4: ${result.currentStep}`);
  if (result.nextCommand) {
    console.log("");
    console.log(`\u2192 \u63A8\u8350\u4E0B\u4E00\u6B65: ${result.nextCommand}`);
    if (result.slashCommand) {
      console.log(`   Slash \u547D\u4EE4: ${result.slashCommand}`);
    }
    if (result.needsSubagent) {
      console.log(`   \u9700\u8981\u5B50\u4EE3\u7406: \u662F`);
    }
  } else {
    console.log("");
    console.log("\u2192 \u5F53\u524D\u65E0\u53EF\u7528\u4E0B\u4E00\u6B65");
    if (result.hint) {
      console.log(`   \u{1F4A1} ${result.hint}`);
    }
  }
  console.log("\u2500".repeat(50));
}

// src/commands/specwf-archive.ts
import { join as join16 } from "path";
import { existsSync as existsSync9, readdirSync as readdirSync5, mkdirSync as mkdirSync5, copyFileSync } from "fs";

// src/core/delta-merge.ts
import { createHash } from "crypto";
import { readFileSync as readFileSync10, writeFileSync as writeFileSync6, existsSync as existsSync7 } from "fs";

// src/parser/heading-tree.ts
function parseHeadings(markdown) {
  const lines = markdown.split("\n");
  const nodes = [];
  const stack = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    const lineNum = i + 1;
    const contentLines = [];
    for (let j = i + 1; j < lines.length; j++) {
      const nextMatch = lines[j].match(/^(#{1,6})\s+(.+)$/);
      if (nextMatch) break;
      contentLines.push(lines[j]);
    }
    const content = contentLines.join("\n").trim();
    const node = { level, text, line: lineNum, children: [], content };
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    if (stack.length === 0) {
      nodes.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ node, level });
  }
  return nodes;
}

// src/core/delta-merge.ts
function fingerprint(content) {
  return createHash("sha256").update(content).digest("hex");
}
function mergeDeltaSpec(baseSpec, deltaSpec, baseFingerprint) {
  if (baseFingerprint) {
    const liveFingerprint = fingerprint(baseSpec);
    if (liveFingerprint === baseFingerprint) {
      return { type: "ok", merged: deltaSpec };
    }
  }
  const baseTree = parseHeadings(baseSpec);
  const deltaTree = parseHeadings(deltaSpec);
  const merged = mergeTrees(baseTree, deltaTree);
  if (merged.conflicts.length > 0) {
    return { type: "conflict", conflicts: merged.conflicts };
  }
  return { type: "ok", merged: renderTree(merged.nodes) };
}
function mergeTrees(base, delta) {
  const conflicts = [];
  const nodes = [];
  const baseIndex = indexNodes(base);
  const deltaIndex = indexNodes(delta);
  const allKeys = /* @__PURE__ */ new Set([...baseIndex.keys(), ...deltaIndex.keys()]);
  for (const key of allKeys) {
    const b = baseIndex.get(key);
    const d = deltaIndex.get(key);
    if (b && !d) {
      nodes.push({ node: b, children: b.children.map((c) => ({ node: c, children: [] })) });
    } else if (!b && d) {
      nodes.push({ node: d, children: d.children.map((c) => ({ node: c, children: [] })) });
    } else if (b && d) {
      const childMerge = mergeTrees(b.children, d.children);
      if (b.content === d.content) {
        nodes.push({ node: b, children: childMerge.nodes });
      } else {
        const lineMerge = tryLineMerge(b.content, d.content);
        if (lineMerge !== null) {
          nodes.push({ node: { ...b, content: lineMerge }, children: childMerge.nodes });
        } else {
          conflicts.push({
            section: b.text,
            message: `Content conflict in section: ${b.text}`,
            baseContent: b.content,
            deltaContent: d.content
          });
          nodes.push({ node: b, children: childMerge.nodes });
        }
      }
      conflicts.push(...childMerge.conflicts);
    }
  }
  return { nodes, conflicts };
}
function indexNodes(nodes) {
  const map = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    map.set(`${node.level}:${node.text}`, node);
  }
  return map;
}
function tryLineMerge(baseText, deltaText) {
  const baseLines = baseText.split("\n");
  const deltaLines = deltaText.split("\n");
  const baseSet = new Set(baseLines);
  const removedFromBase = baseLines.filter(
    (l) => l.trim() && !deltaLines.includes(l)
  );
  if (removedFromBase.length === 0) {
    const result = [...baseLines];
    for (const line of deltaLines) {
      if (!baseSet.has(line)) {
        result.push(line);
      }
    }
    return result.join("\n");
  }
  return null;
}
function renderTree(nodes) {
  const lines = [];
  renderNodes(nodes, lines);
  return lines.join("\n").trim();
}
function renderNodes(nodes, lines) {
  for (const { node, children } of nodes) {
    lines.push(`${"#".repeat(node.level)} ${node.text}`);
    if (node.content) {
      lines.push("");
      lines.push(node.content);
    }
    if (children.length > 0) {
      lines.push("");
      renderNodes(children, lines);
    }
    lines.push("");
  }
}
function mergeAndWrite(liveSpecPath, deltaSpecPath, baseFingerprint) {
  const baseSpec = readFileSync10(liveSpecPath, "utf-8");
  const deltaSpec = readFileSync10(deltaSpecPath, "utf-8");
  const result = mergeDeltaSpec(baseSpec, deltaSpec, baseFingerprint);
  if (result.type === "ok") {
    writeFileSync6(liveSpecPath, result.merged, "utf-8");
  }
  return result;
}

// src/core/code-extract.ts
import { execSync } from "child_process";
import { existsSync as existsSync8, readFileSync as readFileSync11, writeFileSync as writeFileSync7, mkdirSync as mkdirSync4, readdirSync as readdirSync4 } from "fs";
import { join as join15 } from "path";
function extractFromGitDiff(repoDir, changeDir) {
  const diff = getGitDiff(repoDir);
  if (diff === null) {
    return { extractions: [], available: false };
  }
  const domains = changeDir ? detectDomains(changeDir) : ["general"];
  const extractions = [];
  for (const domain of domains) {
    const behaviors = extractBehaviors(diff, domain);
    const constraints = extractConstraints(diff, domain);
    if (behaviors.length > 0 || constraints.length > 0) {
      extractions.push({ domain, behaviors, constraints });
    }
  }
  return { extractions, available: true };
}
function getGitDiff(repoDir) {
  try {
    const diff = execSync("git diff HEAD", {
      cwd: repoDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    if (diff.trim()) return diff;
    const lastCommit = execSync("git diff HEAD~1 HEAD", {
      cwd: repoDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return lastCommit.trim() ? lastCommit : null;
  } catch {
    return null;
  }
}
function detectDomains(changeDir) {
  const specsDir = join15(changeDir, "specs");
  if (!existsSync8(specsDir)) return ["general"];
  try {
    return readdirSync4(specsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return ["general"];
  }
}
function extractBehaviors(diff, _domain) {
  const behaviors = [];
  const lines = diff.split("\n");
  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const content = line.slice(1).trim();
      if (/\b(SHALL|MUST|SHOULD|MAY)\b/.test(content)) {
        behaviors.push(content);
      }
      if (/^(export\s+)?(async\s+)?function\s+/.test(content) || /^(export\s+)?class\s+/.test(content)) {
        behaviors.push(`\u65B0\u589E: ${content}`);
      }
    }
  }
  return behaviors;
}
function extractConstraints(diff, _domain) {
  const constraints = [];
  const lines = diff.split("\n");
  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const content = line.slice(1).trim();
      if (/^(throw|assert|if\s*\()/.test(content) && !content.startsWith("//")) {
        constraints.push(`\u7EA6\u675F: ${content}`);
      }
      if (/^(export\s+)?(interface|type)\s+/.test(content)) {
        constraints.push(`\u7C7B\u578B\u7EA6\u675F: ${content}`);
      }
    }
  }
  return constraints;
}
function writeExtractionToSpec(specsDir, extraction) {
  const domainDir = join15(specsDir, extraction.domain);
  const specPath = join15(domainDir, "spec.md");
  let existing = "";
  if (existsSync8(specPath)) {
    existing = readFileSync11(specPath, "utf-8");
  }
  const section = generateAutoExtractedSection(extraction);
  const updated = existing.trim() ? `${existing.trim()}

${section}` : section;
  mkdirSync4(domainDir, { recursive: true });
  writeFileSync7(specPath, updated, "utf-8");
}
function generateAutoExtractedSection(extraction) {
  const lines = [
    "<!-- AUTO-EXTRACTED: \u4EE5\u4E0B\u5185\u5BB9\u7531 code-extract \u4ECE\u4EE3\u7801 diff \u63D0\u53D6\uFF0C\u8BF7\u4EBA\u5DE5\u5BA1\u6838 -->",
    "",
    "## Auto-Extracted Behaviors",
    ""
  ];
  if (extraction.behaviors.length > 0) {
    lines.push("### Detected Behaviors", "");
    for (const b of extraction.behaviors) {
      lines.push(`- ${b}`);
    }
    lines.push("");
  }
  if (extraction.constraints.length > 0) {
    lines.push("### Detected Constraints", "");
    for (const c of extraction.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push("");
  }
  lines.push("<!-- END AUTO-EXTRACTED -->");
  return lines.join("\n");
}

// src/commands/specwf-archive.ts
function register7(program2) {
  program2.command("archive <change>").description("\u5F52\u6863 change\uFF08delta \u5408\u5E76 + \u4EE3\u7801\u56DE\u704C\uFF09").action(archiveHandler);
}
function archiveHandler(changePath) {
  const specwfDir = join16(process.cwd(), "specwf");
  const fullChangePath = join16(process.cwd(), changePath);
  if (!existsSync9(fullChangePath)) {
    console.error(`\u9519\u8BEF: change \u76EE\u5F55\u4E0D\u5B58\u5728: ${changePath}`);
    process.exit(1);
  }
  const specsDir = join16(fullChangePath, "specs");
  if (existsSync9(specsDir)) {
    mergeDeltaSpecs(specsDir, specwfDir);
    console.log("\u2713 delta-specs \u5408\u5E76\u5B8C\u6210");
  }
  const repoDir = process.cwd();
  const extractResult = extractFromGitDiff(repoDir, fullChangePath);
  if (extractResult.available && extractResult.extractions.length > 0) {
    for (const extraction of extractResult.extractions) {
      writeExtractionToSpec(join16(specwfDir, "specs"), extraction);
    }
    if (extractResult.extractions.length > 0) {
      console.log(`\u2713 \u4EE3\u7801\u8BA4\u77E5\u63D0\u53D6\u5B8C\u6210 (${extractResult.extractions.length} \u4E2A\u57DF)`);
    }
  }
  const archiveDir = archiveChangeDir(specwfDir, fullChangePath);
  console.log(`\u2713 \u5F52\u6863\u5230: ${archiveDir}`);
  const changeName = changePath.split("/").pop() ?? "unknown";
  try {
    updateState(specwfDir, (state) => {
      const change = state.changes.find((c) => c.name === changeName);
      if (change) {
        change.status = "archived";
      }
    });
    console.log("\u2713 state.md \u5DF2\u66F4\u65B0");
  } catch {
  }
  console.log("\u5F52\u6863\u5B8C\u6210\u3002");
}
function mergeDeltaSpecs(deltaDir, specwfDir) {
  const entries = readdirSync5(deltaDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const deltaSpecPath = join16(deltaDir, entry.name, "spec.md");
    const liveSpecPath = join16(specwfDir, "specs", entry.name, "spec.md");
    if (!existsSync9(deltaSpecPath)) continue;
    if (!existsSync9(liveSpecPath)) {
      mkdirSync5(join16(specwfDir, "specs", entry.name), { recursive: true });
      copyFileSync(deltaSpecPath, liveSpecPath);
      continue;
    }
    const result = mergeAndWrite(liveSpecPath, deltaSpecPath);
    if (result.type === "conflict") {
      console.warn(`\u26A0 \u5408\u5E76\u51B2\u7A81: ${entry.name}/spec.md`);
      for (const c of result.conflicts) {
        console.warn(`   \u8282: ${c.section}`);
      }
    }
  }
}

// src/commands/specwf-list.ts
import { join as join17 } from "path";
function register8(program2) {
  program2.command("list").description("\u5217\u51FA milestones/phases/changes").option("--all", "\u5305\u542B\u5F52\u6863").action(listHandler);
}
function listHandler(options) {
  const specwfDir = join17(process.cwd(), "specwf");
  let hasItems = false;
  const milestones = listMilestones(specwfDir);
  if (milestones.length > 0) {
    console.log("Milestones:");
    for (const ms of milestones) {
      console.log(`  ${ms}/`);
      const phases = listPhases(specwfDir, ms);
      for (const ph of phases) {
        console.log(`    ${ph}/`);
        const changes = listChanges(specwfDir, ms, ph);
        for (const ch of changes) {
          console.log(`      ${ch}/`);
        }
      }
    }
    hasItems = true;
  }
  const adhoc = listAdhocChanges(specwfDir);
  if (adhoc.length > 0) {
    if (hasItems) console.log("");
    console.log("\u4E34\u65F6 Changes:");
    for (const ch of adhoc) {
      console.log(`  ${ch}/`);
    }
    hasItems = true;
  }
  if (options.all) {
    const archived = listArchived(specwfDir);
    if (archived.length > 0) {
      if (hasItems) console.log("");
      console.log("\u5F52\u6863:");
      for (const a of archived) {
        console.log(`  ${a}/`);
      }
      hasItems = true;
    }
  }
  if (!hasItems) {
    console.log("(\u65E0\u6761\u76EE)");
  }
}

// src/commands/specwf-template.ts
import { join as join18, dirname as dirname4 } from "path";
import { mkdirSync as mkdirSync6, writeFileSync as writeFileSync8, existsSync as existsSync10, readFileSync as readFileSync13 } from "fs";
import { fileURLToPath as fileURLToPath4 } from "url";
var __dirname4 = dirname4(fileURLToPath4(import.meta.url));
var TEMPLATES_DIR4 = join18(__dirname4, "templates", "artifacts");
var TEMPLATE_TYPES = [
  "proposal",
  "design",
  "tasks",
  "context",
  "research",
  "summary",
  "verification",
  "spec-review",
  "quality-review",
  "goal-review",
  "project.yml",
  "state.md"
];
function register9(program2) {
  program2.command("template <type>").description("\u751F\u6210\u6A21\u677F\u6587\u4EF6\uFF08proposal|design|tasks|context|research|summary|...\uFF09").option("--name <name>", "change \u540D\u79F0", "my-change").option("--dir <path>", "\u76EE\u6807\u76EE\u5F55\uFF08\u9ED8\u8BA4 specwf/changes/<name>/\uFF09").action(templateHandler);
}
function templateHandler(type, options) {
  if (!TEMPLATE_TYPES.includes(type)) {
    console.error(`\u672A\u77E5\u6A21\u677F\u7C7B\u578B: ${type}\u3002\u53EF\u9009: ${TEMPLATE_TYPES.join(", ")}`);
    process.exit(1);
  }
  const templatePath = join18(TEMPLATES_DIR4, type.endsWith(".yml") || type.endsWith(".md") ? type : `${type}.md`);
  if (!existsSync10(templatePath)) {
    console.error(`\u6A21\u677F\u6587\u4EF6\u4E0D\u5B58\u5728: ${templatePath}`);
    process.exit(1);
  }
  let content = readFileSync13(templatePath, "utf-8");
  const name = options.name;
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  content = content.replace(/\{\{name\}\}/g, name);
  content = content.replace(/\{\{date\}\}/g, date);
  content = content.replace(/\{\{phase-name\}\}/g, name);
  content = content.replace(/\{\{change-name\}\}/g, name);
  let targetDir;
  let filename;
  if (options.dir) {
    targetDir = options.dir.startsWith("/") ? options.dir : join18(process.cwd(), options.dir);
    filename = type;
  } else if (type === "project.yml" || type === "state.md") {
    targetDir = join18(process.cwd(), "specwf");
    filename = type;
  } else {
    targetDir = join18(process.cwd(), "specwf", "changes", name);
    filename = type.endsWith(".yml") ? type : `${type}.md`;
  }
  mkdirSync6(targetDir, { recursive: true });
  const fullPath = join18(targetDir, filename);
  writeFileSync8(fullPath, content, "utf-8");
  console.log(`\u2713 \u521B\u5EFA ${fullPath}`);
}

// src/commands/specwf-change.ts
import { join as join19, dirname as dirname5 } from "path";
import { existsSync as existsSync11, readFileSync as readFileSync14, writeFileSync as writeFileSync9 } from "fs";
import { fileURLToPath as fileURLToPath5 } from "url";
var __dirname5 = dirname5(fileURLToPath5(import.meta.url));
function register10(program2) {
  const cmd = program2.command("change").description("\u7BA1\u7406 change\uFF08\u521B\u5EFA/\u5217\u8868\uFF09");
  cmd.command("new <name>").description("\u521B\u5EFA\u4E34\u65F6 change\uFF08\u4E0E\u9636\u6BB5\u65E0\u5173\uFF09").option("--dir <path>", "specwf \u76EE\u5F55", "specwf").action(newChange);
  cmd.action(() => {
    console.log("\u7528\u6CD5: specwf change new <name>");
  });
}
function newChange(name, options) {
  const specwfDir = join19(process.cwd(), options.dir);
  const changeDir = createAdhocChangeDir(specwfDir, name);
  console.log(`\u2713 \u521B\u5EFA change \u76EE\u5F55: changes/${name}/`);
  const templatesDir = join19(__dirname5, "templates", "artifacts");
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  for (const file of ["proposal.md", "design.md", "tasks.md"]) {
    const tplPath = join19(templatesDir, file);
    let content;
    if (existsSync11(tplPath)) {
      content = readFileSync14(tplPath, "utf-8");
      content = content.replace(/\{\{name\}\}/g, name);
      content = content.replace(/\{\{date\}\}/g, date);
    } else {
      content = `# ${file.replace(".md", "")}: ${name}
`;
    }
    writeFileSync9(join19(changeDir, file), content, "utf-8");
  }
  console.log("\u2713 \u521B\u5EFA\u6A21\u677F\u6587\u4EF6: proposal.md, design.md, tasks.md");
  try {
    updateState(specwfDir, (state) => {
      state.adhoc.push({ name, status: "proposal", depends_on: [] });
    });
    console.log("\u2713 state.md \u5DF2\u66F4\u65B0");
  } catch {
    console.log("\u26A0 state.md \u66F4\u65B0\u5931\u8D25\uFF08\u975E\u5173\u952E\uFF09");
  }
  console.log("");
  console.log("\u2192 \u4E0B\u4E00\u6B65: \u5B8C\u6210 proposal \u540E\uFF0C\u8FD0\u884C specwf continue \u63A8\u8FDB");
}

// src/cli.ts
var version = "0.1.0";
program.name("specwf").description("\u89C4\u683C\u9A71\u52A8\u5F00\u53D1\u5DE5\u4F5C\u6D41 \u2014 spec-driven development workflow").version(version);
register(program);
register2(program);
register3(program);
register4(program);
register5(program);
register6(program);
register7(program);
register8(program);
register9(program);
register10(program);
program.parse();
