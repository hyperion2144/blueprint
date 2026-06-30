#!/usr/bin/env node

// src/cli.ts
import { program } from "commander";
import { readFileSync as readFileSync11 } from "fs";
import { join as join19, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// src/commands/specwf-init.ts
import { join as join6 } from "path";

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
  const archiveRoot = join2(specwfDir, "archive", "changes");
  mkdirSync(archiveRoot, { recursive: true });
  const archiveDir = join2(archiveRoot, `${date}-${changeName}`);
  if (existsSync2(changeDir)) {
    renameSync(changeDir, archiveDir);
  }
  return archiveDir;
}
function archiveMilestoneDir(specwfDir, milestoneId) {
  const sourceDir = join2(specwfDir, "milestones", milestoneId);
  const archiveDir = join2(specwfDir, "archive", "milestones", milestoneId);
  if (!existsSync2(sourceDir)) {
    return archiveDir;
  }
  mkdirSync(join2(specwfDir, "archive", "milestones"), { recursive: true });
  renameSync(sourceDir, archiveDir);
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
  const dir = join2(specwfDir, "archive", "changes");
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
  let body;
  try {
    const existing = readFrontmatterFile(statePath(specwfDir));
    body = existing.content;
  } catch {
    body = generateStateBody(state);
  }
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
      const pkg2 = JSON.parse(readFileSync5(join4(rootDir, "package.json"), "utf-8"));
      if (pkg2.dependencies?.next) info.framework = "next.js";
      else if (pkg2.dependencies?.react) info.framework = "react";
      else if (pkg2.dependencies?.vue) info.framework = "vue";
      else if (pkg2.dependencies?.express) info.framework = "express";
      else if (pkg2.dependencies?.fastify) info.framework = "fastify";
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

// src/templates/workflows/init.ts
var instructions = `## Input
- No prior state required (this is the project entry point)
- Node.js 20+ must be installed

## Steps

### Step 1: Check state
Run \`specwf state\` to verify the project is ready for initialization.

### Step 2: Get context
Run \`specwf context init\` to see the file manifest.

### Step 3: Execute initialization
Run \`specwf init --yes\` to create the project skeleton:

- \`specwf/\` directory structure
- \`specwf/project.yml\` \u2014 project workflow configuration
- \`specwf/state.md\` \u2014 state machine file
- \`specwf/requirements.md\` \u2014 requirements document (template)
- \`specwf/conventions/\` \u2014 coding conventions directory
- \`.omp/commands/specwf-*.md\` \u2014 16 slash commands
- \`.omp/agents/specwf-*.md\` \u2014 8 agent definitions
- \`.omp/skills/specwf-*/SKILL.md\` \u2014 16 skill guides

### Step 4: Brownfield mode (existing projects)
For projects with existing code, use \`specwf init --yes --brownfield\`:

Dispatches two sub-agents in parallel:

**Agent 1: specwf-codebase-mapper** \u2014 analyzes existing codebase for tech stack, architecture, conventions, and pitfalls.

**Agent 2: specwf-spec-bootstrapper** \u2014 extracts behavioral contracts from existing code signatures, comments, and tests.

### Step 5: Advance
Run \`specwf continue\` to proceed to the requirements exploration phase (grill).

## Output

| File | Description |
|------|-------------|
| \`specwf/\` directory | Project skeleton |
| \`specwf/project.yml\` | Workflow configuration |
| \`specwf/state.md\` | State machine |
| \`specwf/requirements.md\` | Requirements template |
| \`.omp/commands/*.md\` | Generated slash commands |
| \`.omp/agents/*.md\` | Generated agent definitions |
| \`.omp/skills/*/SKILL.md\` | Generated skill guides |

Brownfield extras: \`research/stack.md\`, \`research/architecture.md\`, \`research/pitfalls.md\`, \`conventions/codebase-conventions.md\`, \`specs/<domain>/spec.md\`.

## Guardrails

- Run \`specwf init\` only once per project \u2014 re-running overwrites generated files
- Use \`--yes\` to skip interactive prompts in CI/non-interactive environments
- Brownfield mode is read-only analysis \u2014 it never modifies source code
- After initialization, fill in \`requirements.md\` before advancing`;
function getInitSkillTemplate() {
  return {
    name: "specwf-init",
    description: "Initialize specwf project structure and generate platform files",
    instructions
  };
}
function getInitCommandTemplate() {
  return {
    name: "SpecWF: Init",
    description: "Initialize specwf project structure and generate platform files",
    category: "Setup",
    tags: ["specwf", "init", "setup"],
    content: instructions
  };
}

// src/templates/workflows/grill.ts
var instructions2 = `## Input
- \`specwf/requirements.md\` must exist (created by init)
- \`specwf/project.yml\` for project context
- State must be at \`requirements-defined\` or equivalent

## Steps

### Step 1: Check state
Run \`specwf state\` to verify the project is ready for requirements exploration.

### Step 2: Get context
Run \`specwf context grill\` to read the file manifest.

### Step 3: Explore requirements
Use the 5W1H framework to question every aspect:
- **Overview** \u2014 core project goals and value proposition
- **User roles** \u2014 target users and their workflows
- **Functional scope** \u2014 what the system must do and will not do
- **Non-functional requirements** \u2014 performance, security, compliance
- **Technical preferences** \u2014 preferred languages, frameworks, deployment
- **Risks** \u2014 known risks, unknowns, assumptions

Record each decision in \`specwf/requirements.md\` as consensus is reached. No code is written during this phase.

### Step 4: Confirm consensus
Review \`requirements.md\` with the user item by item. Ensure no ambiguity remains.

### Step 5: Advance
Run \`specwf continue\` to proceed to the research phase.

## Output
- \`specwf/requirements.md\` \u2014 populated with agreed requirements

## Guardrails
- No code is written during grill \u2014 this is pure exploration
- Do not skip questions that seem obvious \u2014 hidden assumptions cause rework
- Record decisions as they are made, not at the end
- If the user cannot answer a question, mark it \`[TODO: decide]\` and move on`;
function getGrillSkillTemplate() {
  return {
    name: "specwf-grill",
    description: "Requirements exploration \u2014 detailed questioning until shared understanding is reached",
    instructions: instructions2
  };
}
function getGrillCommandTemplate() {
  return {
    name: "SpecWF: Grill",
    description: "Requirements exploration \u2014 detailed questioning until shared understanding is reached",
    category: "Discovery",
    tags: ["specwf", "grill", "requirements", "discovery"],
    content: instructions2
  };
}

// src/templates/workflows/research.ts
var instructions3 = `## Input
- \`specwf/requirements.md\` must be complete (grill phase done)
- \`specwf/project.yml\` for technical constraints

## Steps

### Step 1: Check state
Run \`specwf state\` to verify the project is ready for research.

### Step 2: Get context
Run \`specwf context research\` to read the file manifest (requirements.md, project.yml).

### Step 3: Dispatch research sub-agents
**You are the orchestrator \u2014 dispatch, do not research yourself.** Spawn \`specwf-researcher\` sub-agents in parallel, one per technical direction (stack, architecture, pitfalls).

Construct each sub-agent prompt:

\`\`\`text
Sub-agent: specwf-researcher
Task: Research <direction> for project <project-name>

[Context]
- Read requirements.md from specwf/requirements.md
- Extract constraints from specwf/project.yml
- Research scope: <stack | architecture | pitfalls>

[Responsibilities]
- Compare at least 2 candidate solutions
- Assess feasibility, risk, and trade-offs
- Produce a recommended approach with rationale
- Output to specwf/research/<stack.md | architecture.md | pitfalls.md>

[Constraints]
- Read-only \u2014 do not modify code or config
- Mark speculative findings with confidence levels
- Use templates: specwf template codebase-stack / codebase-architecture / codebase-pitfalls
\`\`\`

### Step 4: Verify sub-agent output
After all sub-agents complete, verify:
- \`research/stack.md\` exists with tech stack comparison and recommendation
- \`research/architecture.md\` exists with architecture evaluation
- \`research/pitfalls.md\` exists with risk assessment
- Write \`research/summary.md\` synthesizing all findings into one recommendation

### Step 5: Advance
Run \`specwf continue\` to proceed to roadmap definition.

## Output
- \`research/stack.md\` \u2014 recommended tech stack with alternatives compared
- \`research/architecture.md\` \u2014 recommended architecture with rationale
- \`research/pitfalls.md\` \u2014 known risks and mitigation strategies
- \`research/summary.md\` \u2014 consolidated research conclusion

## Guardrails
- **You are the orchestrator** \u2014 dispatch sub-agents, do not research yourself
- Each sub-agent must compare at least 2 alternatives \u2014 never recommend the first option found
- Sub-agents are independent and run in parallel
- Mark speculative findings with confidence levels`;
function getResearchSkillTemplate() {
  return {
    name: "specwf-research",
    description: "Project-level technical research \u2014 dispatch researcher sub-agents in parallel",
    instructions: instructions3
  };
}
function getResearchCommandTemplate() {
  return {
    name: "SpecWF: Research",
    description: "Project-level technical research \u2014 dispatch researcher sub-agents in parallel",
    category: "Discovery",
    tags: ["specwf", "research", "architecture", "tech-stack", "sub-agent"],
    content: instructions3
  };
}

// src/templates/workflows/roadmap.ts
var instructions4 = `## Input
- \`specwf/requirements.md\` \u2014 complete requirements
- \`specwf/research/\` \u2014 technical research results (if available)

## Steps

### Step 1: Check state
Run \`specwf state\` to confirm the project is ready for roadmap planning.

### Step 2: Get context
Run \`specwf context roadmap\` to read requirements.md and research outputs.

### Step 3: Define Milestones
Define milestones by functional area or release cadence. Each milestone records:
- **ID** \u2014 short identifier (e.g. \`M1-core\`)
- **Goal** \u2014 one-sentence milestone objective
- **Scope** \u2014 included and excluded functionality
- **Success criteria** \u2014 measurable completion conditions
- **Estimated duration** \u2014 typically 1-3 months

### Step 4: Split each Milestone into Phases
Each milestone contains 3-8 phases. Each phase defines:
- **ID** \u2014 \`ph.N-<name>\`
- **Goal** \u2014 what this phase delivers
- **Dependencies** \u2014 predecessor phases or external deps
- **Inputs/Outputs** \u2014 specs, conventions, design docs
- **Estimated changes** \u2014 number of Change units

### Step 5: Validate coverage
- All functional scope is covered by milestones and phases
- Phase dependencies form a DAG (no cycles)
- Each phase has verifiable success criteria

### Step 6: Write roadmap.md
Output \`specwf/roadmap.md\` using the recommended format.

### Step 7: Advance
Run \`specwf state set-milestone <id>\` then \`specwf continue\`.

## Output
- \`specwf/roadmap.md\` \u2014 complete roadmap document
- \`specwf/milestones/<id>/\` \u2014 per-milestone directories

## Guardrails
- Start with the smallest viable milestone first
- Phase count per milestone should stay under 8
- Each phase must produce a demonstrable increment`;
function getRoadmapSkillTemplate() {
  return {
    name: "specwf-roadmap",
    description: "Roadmap definition \u2014 split project into Milestones x Phases",
    instructions: instructions4
  };
}
function getRoadmapCommandTemplate() {
  return {
    name: "SpecWF: Roadmap",
    description: "Roadmap definition \u2014 split project into Milestones x Phases",
    category: "Planning",
    tags: ["specwf", "roadmap", "planning", "milestones"],
    content: instructions4
  };
}

// src/templates/workflows/milestone.ts
var instructions5 = `## Input
- \`specwf/roadmap.md\` must exist with defined milestones
- State must be at \`roadmap-defined\` or \`milestone-active\`

## Steps

### Step 1: Check state
Run \`specwf state\` to see the current milestone and phase.

### Step 2: Get context
Run \`specwf context milestone\` to read roadmap.md and the milestone list.

### Step 3: Switch milestone
Run \`specwf state set-milestone <id>\` to activate a milestone.

### Step 4: Set phase
Run \`specwf state set-phase <id>\` to switch to a specific phase.

### Step 5: Advance
Run \`specwf continue\` to proceed to the discuss phase.

## Output
- Updated state.md with new active milestone/phase

## Guardrails
- Switching milestones archives the current one (if not shipped)
- Phase transitions within a milestone do not trigger archival`;
function getMilestoneSkillTemplate() {
  return {
    name: "specwf-milestone",
    description: "Milestone management \u2014 switch/create milestones, set current phase",
    instructions: instructions5
  };
}
function getMilestoneCommandTemplate() {
  return {
    name: "SpecWF: Milestone",
    description: "Milestone management \u2014 switch/create milestones, set current phase",
    category: "Planning",
    tags: ["specwf", "milestone", "planning"],
    content: instructions5
  };
}

// src/templates/workflows/discuss.ts
var instructions6 = `## Input
- Active milestone and phase must be set
- \`specwf/roadmap.md\` \u2014 current phase description and boundaries
- \`specwf/project.yml\` \u2014 project configuration

## Steps

### Step 1: Check state
Run \`specwf state\` to confirm the current phase is ready for discussion.

### Step 2: Get context
Run \`specwf context discuss\` to read roadmap.md and project.yml.

### Step 3: Discuss and record decisions
Walk through each topic with the user, recording consensus in context.md:
- **Phase goals** \u2014 what this phase delivers
- **Architecture decisions (D1/D2/...)** \u2014 numbered and recorded
- **Interface contracts** \u2014 key APIs and data models
- **Implementation constraints** \u2014 technical limits
- **Change split plan** \u2014 preliminary breakdown
- **Non-goals** \u2014 explicitly excluded

Gray areas are marked \`[TODO: discuss]\`.

### Step 4: Advance
Run \`specwf continue\` to proceed to research-phase.

## Output
- \`context.md\` \u2014 phase-level implementation decisions document

## Guardrails
- Every architecture decision gets a unique D-number for traceability
- Do not skip gray areas \u2014 mark them and revisit
- context.md is the single source of truth for phase implementation`;
function getDiscussSkillTemplate() {
  return {
    name: "specwf-discuss",
    description: "Phase discussion \u2014 capture implementation decisions into context.md",
    instructions: instructions6
  };
}
function getDiscussCommandTemplate() {
  return {
    name: "SpecWF: Discuss",
    description: "Phase discussion \u2014 capture implementation decisions into context.md",
    category: "Planning",
    tags: ["specwf", "discuss", "context", "decisions"],
    content: instructions6
  };
}

// src/templates/workflows/research-phase.ts
var instructions7 = `## Input
- \`context.md\` must exist (discuss phase done)
- Related specs, conventions, and external dependencies

## Steps

### Step 1: Check state
Run \`specwf state\` to confirm the phase is ready for research.

### Step 2: Get context
Run \`specwf context research-phase\` to read context.md and related documents.

### Step 3: Dispatch phase researcher
**You are the orchestrator \u2014 dispatch, do not research yourself.** Spawn \`specwf-phase-researcher\` sub-agent.

Construct the sub-agent prompt:

\`\`\`text
Sub-agent: specwf-phase-researcher
Task: Research implementation paths for phase <phase-id>

[Context]
- Read context.md for locked decisions and discretion areas
- Read related specs/ for existing behavioral contracts
- Read conventions/ for coding standards

[Responsibilities]
- Investigate concrete implementation approaches
- Identify reusable patterns from existing codebase
- Flag known pitfalls and edge cases
- Produce research.md with recommended paths and TDD implications
- Output to milestones/<ms>/phases/<ph>/research.md

[Constraints]
- Respect context.md locked decisions \u2014 they are non-negotiable
- Surface trade-offs explicitly \u2014 do not present one option as the only path
- Note confidence levels for speculative findings
\`\`\`

### Step 4: Verify output
Confirm \`research.md\` was written by the sub-agent with:
- Recommended implementation paths with rationale
- Known pitfalls and edge cases
- TDD implications annotated

### Step 5: Advance
Run \`specwf continue\` to proceed to the split phase.

## Output
- \`research.md\` \u2014 phase-level implementation research with recommended paths and known pitfalls

## Guardrails
- **You are the orchestrator** \u2014 dispatch the sub-agent, do not research yourself
- Research must respect context.md locked decisions
- Surface trade-offs explicitly`;
function getResearchPhaseSkillTemplate() {
  return {
    name: "specwf-research-phase",
    description: "Phase research \u2014 dispatch phase-researcher sub-agent",
    instructions: instructions7
  };
}
function getResearchPhaseCommandTemplate() {
  return {
    name: "SpecWF: Research Phase",
    description: "Phase research \u2014 dispatch phase-researcher sub-agent",
    category: "Discovery",
    tags: ["specwf", "research-phase", "implementation", "sub-agent"],
    content: instructions7
  };
}

// src/templates/workflows/split.ts
var instructions8 = `## Input
- \`context.md\` \u2014 phase decisions and constraints
- \`research.md\` \u2014 implementation research

## Steps

### Step 1: Check state
Run \`specwf state\` to confirm the phase is ready for change splitting.

### Step 2: Get context
Run \`specwf context split\` to read context.md and research.md.

### Step 3: Split into changes
Decompose the phase scope into independently implementable Change units:
- Each change is a vertical slice (not layer-by-layer)
- Identify dependencies between changes -> dependency graph
- Each change gets a descriptive kebab-case name
- Create change directories: \`specwf change new <name> --phase <phase-id>\`

### Step 4: Define dependency graph
Document dependencies in state.md:
\`\`\`yaml
changes:
  - name: scaffold-auth
    status: planned
    depends_on: []
  - name: login-flow
    status: planned
    depends_on: [scaffold-auth]
\`\`\`

### Step 5: Advance
Run \`specwf continue\` to proceed to change planning.

## Output
- \`specwf/changes/<name>/\` directories \u2014 one per change
- Updated \`state.md\` with change dependency graph

## Guardrails
- Changes must be vertical slices \u2014 each delivers end-to-end value
- Dependency graph must be a DAG \u2014 no cycles
- 3-8 changes per phase is the sweet spot
- Changes that are purely sequential should be merged into one`;
function getSplitSkillTemplate() {
  return {
    name: "specwf-split",
    description: "Change splitting \u2014 dependency graph + N changes",
    instructions: instructions8
  };
}
function getSplitCommandTemplate() {
  return {
    name: "SpecWF: Split",
    description: "Change splitting \u2014 dependency graph + N changes",
    category: "Planning",
    tags: ["specwf", "split", "changes", "dependency-graph"],
    content: instructions8
  };
}

// src/templates/workflows/adhoc.ts
var instructions9 = `## Input
- specwf project must be initialized
- Change name must be determined (kebab-case)

## Steps

### Step 1: Check state
Run \`specwf state\` to verify the project context.

### Step 2: Create the adhoc change
Run \`specwf change new <name>\` to create:
- \`specwf/changes/<name>/proposal.md\` \u2014 proposal template
- \`specwf/changes/<name>/design.md\` \u2014 design template
- \`specwf/changes/<name>/tasks.md\` \u2014 tasks template
- \`specwf/changes/<name>/specs/\` \u2014 delta-specs directory

The change is registered in \`state.md\` under the adhoc list with status \`proposal\`.

### Step 3: Fill the proposal
Edit \`proposal.md\` \u2014 describe the intent, scope, approach, and must-haves.

### Step 4: Advance
Run \`specwf continue change <name>\` to proceed through the standard change cycle.

## Output
- \`specwf/changes/<name>/\` \u2014 change directory with template files
- Updated \`state.md\` with new adhoc entry

## Guardrails
- Adhoc changes do NOT go through milestone/phase discuss/research-phase/split flow
- To associate with a phase, use \`specwf change new --phase <id>\`
- Archived adhoc changes are stored under \`specwf/archive/\`
- Adhoc changes follow the same plan->apply->review->verify->archive cycle as phase changes`;
function getAdhocSkillTemplate() {
  return {
    name: "specwf-adhoc",
    description: "Create adhoc change \u2014 independent change unrelated to milestone/phase",
    instructions: instructions9
  };
}
function getAdhocCommandTemplate() {
  return {
    name: "SpecWF: Adhoc",
    description: "Create adhoc change \u2014 independent change unrelated to milestone/phase",
    category: "Workflow",
    tags: ["specwf", "adhoc", "change"],
    content: instructions9
  };
}

// src/templates/workflows/plan.ts
var instructions10 = `## Input
- Change \`proposal.md\` must be confirmed (not template)
- \`context.md\` \u2014 phase-level implementation decisions (for phase changes)
- Related \`specs/\` and \`conventions/\` files

## Steps

### Step 1: Check state
Run \`specwf state\` to confirm the change is ready for planning.

### Step 2: Get context
Run \`specwf context plan\` to get the file manifest, then read:
- Related \`specs/\` files \u2014 existing behavioral contracts
- \`conventions/\` \u2014 coding standards
- \`context.md\` \u2014 phase-level locked decisions

### Step 3: Dispatch planner sub-agent
**You are the orchestrator \u2014 dispatch, do not design yourself.** Spawn \`specwf-planner\` sub-agent.

Construct the sub-agent prompt:

\`\`\`text
Sub-agent: specwf-planner
Task: Design technical solution for change <change-name>

[Context]
- Read the change proposal from specwf/changes/<change-name>/proposal.md
- Read context.md for locked decisions (if phase-level)
- Read related specs/ for existing behavioral contracts
- Read conventions/ for coding standards

[Responsibilities]
1. Design technical approach -> design.md (template: specwf template design)
   - Architecture changes, data structures, data flow, interface design
   - File manifest, test strategy, alternatives considered, risk points
2. Pre-write delta-specs -> specs/<domain>/spec.md
   - Use SHALL/MUST with GIVEN/WHEN/THEN scenarios
   - Cover happy path, edge cases, and error paths
3. Break down into tasks -> tasks.md (template: specwf template tasks)
   - Annotate each task with type (behavior/config/refactor/docs/scaffolding)
   - type:behavior tasks must have RED->GREEN->REFACTOR triples
   - Define wave grouping and task dependencies

[Constraints]
- Respect proposal.md must_haves \u2014 do not reduce scope
- Respect context.md locked decisions \u2014 do not contradict
- Delta-specs describe behavior, not implementation details
- Edge case coverage is mandatory
- All output to specwf/changes/<change-name>/
\`\`\`

### Step 4: Verify planner output
After the planner completes, verify:
- \`design.md\` exists with architecture, data flow, alternatives
- \`tasks.md\` exists with type annotations and TDD triples
- \`specs/<domain>/spec.md\` exists with SHALL/MUST scenarios
- All must_haves from proposal.md are covered by tasks
- No contradictions with context.md decisions

### Step 5: Advance
Run \`specwf continue\` to proceed to the apply phase.

## Output
- \`design.md\` \u2014 technical design document
- \`tasks.md\` \u2014 implementation task checklist
- \`specs/<domain>/spec.md\` \u2014 delta-specs

## Guardrails
- **You are the orchestrator** \u2014 dispatch specwf-planner, do not design yourself
- type:behavior tasks MUST have RED->GREEN->REFACTOR triples
- Delta-specs describe behavior, not implementation details
- If a change is too large to split into clear tasks, return to split phase`;
function getPlanSkillTemplate() {
  return {
    name: "specwf-plan",
    description: "Change design \u2014 dispatch planner sub-agent for design + tasks + delta-specs",
    instructions: instructions10
  };
}
function getPlanCommandTemplate() {
  return {
    name: "SpecWF: Plan",
    description: "Change design \u2014 dispatch planner sub-agent for design + tasks + delta-specs",
    category: "Workflow",
    tags: ["specwf", "plan", "design", "tasks", "delta-specs", "sub-agent"],
    content: instructions10
  };
}

// src/templates/workflows/apply.ts
var instructions11 = `## Input
- Plan phase complete: \`design.md\`, \`tasks.md\`, delta-specs ready
- \`specwf continue\` has routed here (state at \`change-planning\`)

## Steps

### Step 1: Check state
Run \`specwf state\` to confirm the change is ready for implementation. Note the change name and current status.

### Step 2: Get context
Run \`specwf context apply\` to get the file manifest, then read:
- \`design.md\` \u2014 technical approach
- \`tasks.md\` \u2014 implementation checklist with type annotations
- \`delta-specs\` \u2014 behavioral contracts (SHALL/MUST)
- Dependent \`specs/\` \u2014 existing global specs

### Step 3: Dispatch executor sub-agent
**This is the main action.** You (the orchestrating agent) do NOT implement code directly. Instead, dispatch the \`specwf-executor\` sub-agent with the task tool.

Construct the sub-agent prompt with these sections:

\`\`\`text
Sub-agent: specwf-executor
Task: Implement all tasks in tasks.md for change <change-name>

[Context]
- Read design.md from specwf/changes/<change-name>/design.md
- Read tasks.md from specwf/changes/<change-name>/tasks.md
- Read delta-specs from specwf/changes/<change-name>/specs/

[Execution Protocol]
- Execute tasks in wave order as listed in tasks.md
- type:behavior tasks: follow RED->GREEN->REFACTOR (mandatory TDD)
  - RED: write failing test, commit: test(<scope>): RED - <description>
  - GREEN: minimal implementation to pass, commit: feat(<scope>): GREEN - <description>
  - REFACTOR: improve structure under test protection, commit: refactor(<scope>): REFACTOR - <description>
- type:config/refactor/docs/scaffolding: implement directly, single commit each
- Each commit must be atomic (one task per commit)
- After each wave, run type check and full test suite
- Auto-fix bugs and missing code (annotate [auto-fix] / [auto-add])
- Pause and ask for architecture-level changes

[Constraints]
- Read-only access to design.md and delta-specs \u2014 do not modify them
- Write code only, commit atomically, push when all waves complete
- Output a completion report: tasks completed, tests passed, commits made
\`\`\`

### Step 4: Verify sub-agent output
After the executor completes, verify:
- All tasks.md checkboxes are checked
- Type check passes (\`tsc --noEmit\`)
- All tests pass (\`vitest run\`)
- Each delta-spec SHALL/MUST has corresponding test coverage
- Commits follow Conventional Commits format

### Step 5: Generate change summary
Run \`specwf template change-summary --name <change-name> --dir specwf/changes/<change-name>\`, then fill it with actual details (intent, files changed, key decisions, verification results). Do NOT skip \u2014 the summary is the handoff artifact for review.

### Step 6: Pre-advance checklist
Before running \`specwf continue\`, confirm:
- [ ] Executor sub-agent completed all waves
- [ ] All tasks.md checkboxes are checked
- [ ] Type check passes
- [ ] All tests pass
- [ ] Change summary written and filled (not template)

If any item is unchecked, go back and complete it. Do NOT advance with unchecked items.

### Step 7: Advance
Run \`specwf continue\` to proceed to review.

## Guardrails
- **You are the orchestrator, not the implementer** \u2014 always dispatch \`specwf-executor\`, never implement code yourself
- The executor sub-agent runs in an isolated environment \u2014 provide full paths in the prompt
- GREEN phase writes ONLY enough code to pass \u2014 save refactoring for REFACTOR
- Never skip RED \u2014 always write the failing test first
- Cross-change shared code uses dependency conventions \u2014 never copy-paste
- **Summary is mandatory**: advancing without a filled change-summary.md is a process violation`;
function getApplySkillTemplate() {
  return {
    name: "specwf-apply",
    description: "Code implementation \u2014 dispatch executor sub-agent for TDD RED->GREEN->REFACTOR",
    instructions: instructions11
  };
}
function getApplyCommandTemplate() {
  return {
    name: "SpecWF: Apply",
    description: "Code implementation \u2014 dispatch executor sub-agent for TDD RED->GREEN->REFACTOR",
    category: "Workflow",
    tags: ["specwf", "apply", "implementation", "tdd", "sub-agent"],
    content: instructions11
  };
}

// src/templates/workflows/review.ts
var instructions12 = `## Input
- Apply phase complete: implementation code, tests, summary.md

## Steps

### Step 1: Check state
Run \`specwf state\` to confirm the change is ready for review.

### Step 2: Get context
Run \`specwf context review\` to read implementation outputs and the change directory.

### Step 3: Dispatch parallel review sub-agents
**You are the orchestrator \u2014 dispatch, do not review yourself.** Spawn three \`specwf-reviewer\` sub-agents in parallel.

Construct each sub-agent prompt:

\`\`\`text
Sub-agent: specwf-reviewer
Task: <Spec | Quality | Goal> review for change <change-name>

[Context]
- Read proposal.md from specwf/changes/<change-name>/proposal.md
- Read delta-specs from specwf/changes/<change-name>/specs/
- Read design.md from specwf/changes/<change-name>/design.md
- Read conventions/ for coding standards

[Review Scope]
--- For Spec Review ---
- Check each SHALL/MUST in delta-specs against implementation
- Annotate: PASS / FAIL / NOT_APPLICABLE with file:line references
- Output to specwf/changes/<change-name>/spec-review.md

--- For Quality Review ---
- Bug patterns, security vulnerabilities (injection, XSS, auth bypass)
- Code conventions, common AI mistakes (hallucinated APIs, over-abstraction)
- Severity: BLOCKER / MAJOR / MINOR / INFO
- Output to specwf/changes/<change-name>/quality-review.md

--- For Goal Review ---
- Cross-reference proposal.md goals and must_haves
- Annotate: ACHIEVED / PARTIAL / NOT_ACHIEVED
- Output to specwf/changes/<change-name>/goal-review.md

[Constraints]
- Every issue must cite specific file:line references
- No vague opinions \u2014 evidence only
- All three agents run independently \u2014 no inter-dependencies
\`\`\`

### Step 4: Aggregate results
After all three sub-agents complete, check the output:
- \`spec-review.md\`: all SHALL/MUST covered? BLOCKERs?
- \`quality-review.md\`: any BLOCKERs or MAJOR issues?
- \`goal-review.md\`: all goals ACHIEVED?

### Step 5: Handle findings
- Auto-fixable issues -> fix and re-verify
- Architecture-level issues -> pause and ask user
- All-pass (no BLOCKERs) -> advance

### Step 6: Advance
Run \`specwf continue\` to proceed to verify.

## Guardrails
- **You are the orchestrator** \u2014 dispatch reviewers, do not review yourself
- All three reviews run in parallel \u2014 they have no inter-dependencies
- Gate behavior depends on project.yml \`review.gate\` setting
- Review findings are classified: BLOCKER (must fix), FLAG (should fix), NOTE (informational)`;
function getReviewSkillTemplate() {
  return {
    name: "specwf-review",
    description: "Triple review \u2014 dispatch reviewer sub-agents in parallel",
    instructions: instructions12
  };
}
function getReviewCommandTemplate() {
  return {
    name: "SpecWF: Review",
    description: "Triple review \u2014 dispatch reviewer sub-agents in parallel",
    category: "Workflow",
    tags: ["specwf", "review", "quality", "specs", "sub-agent"],
    content: instructions12
  };
}

// src/templates/workflows/verify.ts
var instructions13 = `## Input
- Review phase complete: spec-review.md, quality-review.md, goal-review.md
- All review blockers resolved

## Steps

### Step 1: Check state
Run \`specwf state\` to confirm the change is ready for verification.

### Step 2: Get context
Run \`specwf context verify\` to read review outputs and implementation files.

### Step 3: Dispatch verifier sub-agent
**You are the orchestrator \u2014 dispatch, do not verify yourself.** Spawn \`specwf-verifier\` sub-agent.

Construct the sub-agent prompt:

\`\`\`text
Sub-agent: specwf-verifier
Task: Verify change <change-name> delivers what it promised

[Context]
- Read delta-specs from specwf/changes/<change-name>/specs/
- Read tasks.md from specwf/changes/<change-name>/tasks.md
- Read review reports: spec-review.md, quality-review.md, goal-review.md

[Responsibilities]
- Run the full test suite \u2014 diagnose any failures to root cause
- Verify each delta-spec SHALL/MUST has passing test coverage
- Check TDD commit integrity (RED->GREEN->REFACTOR for type:behavior tasks)
- Scan for anti-patterns and regressions
- Output VERIFICATION.md with status: passed | gaps_found | human_needed

[Constraints]
- Goal-backward analysis: does the code deliver what the phase promised?
- TDD commit integrity is a BLOCKER \u2014 missing RED commits fail verification
- Test suite must pass completely \u2014 flaky tests are treated as failures
- Output to specwf/changes/<change-name>/VERIFICATION.md
\`\`\`

### Step 4: Handle results
- \`passed\` -> advance to archive
- \`gaps_found\` -> route back to apply (reapply) or plan (replan)
- \`human_needed\` -> surface to user with specific blocking questions

### Step 5: Advance
Run \`specwf continue\` to proceed to archive (if passed).

## Output
- \`VERIFICATION.md\` \u2014 verification report with pass/gaps/blocked status

## Guardrails
- **You are the orchestrator** \u2014 dispatch verifier, do not verify yourself
- Verification uses goal-backward analysis
- TDD commit integrity is a BLOCKER
- Test suite must pass completely`;
function getVerifySkillTemplate() {
  return {
    name: "specwf-verify",
    description: "Test verification \u2014 dispatch verifier sub-agent",
    instructions: instructions13
  };
}
function getVerifyCommandTemplate() {
  return {
    name: "SpecWF: Verify",
    description: "Test verification \u2014 dispatch verifier sub-agent",
    category: "Workflow",
    tags: ["specwf", "verify", "testing", "diagnosis", "sub-agent"],
    content: instructions13
  };
}

// src/templates/workflows/archive.ts
var instructions14 = `## Input
- Verify phase passed (VERIFICATION.md status: passed)
- All changes committed and pushed

## Steps

### Step 1: Check state
Run \`specwf state\` to confirm the change is ready for archival.

### Step 2: Get context
Run \`specwf context archive\` to read the change directory and global specs.

### Step 3: Dispatch archiver sub-agent
**You are the orchestrator \u2014 dispatch, do not archive yourself.** Spawn \`specwf-archiver\` sub-agent.

Construct the sub-agent prompt:

\`\`\`text
Sub-agent: specwf-archiver
Task: Archive completed change <change-name>

[Context]
- Read the change directory: specwf/changes/<change-name>/
- Read global specs: specwf/specs/
- Read state.md for current change status

[Responsibilities]
- Merge delta-specs from specwf/changes/<change-name>/specs/ into specwf/specs/
- Run code cognition backfill (update context.md with learned patterns)
- Move change directory to specwf/archive/<YYYY-MM-DD>-<change-name>/
- Update state.md: mark change as archived

[Constraints]
- Delta-spec merge must resolve conflicts, not overwrite
- New specs append, modified specs update, removed specs archive
- Archived changes are never deleted \u2014 they form project decision history
- If merge fails, report the conflict \u2014 do not force-overwrite
\`\`\`

### Step 4: Verify archival
Confirm the sub-agent completed successfully:
- Global \`specwf/specs/\` updated with delta-specs
- Change directory moved to \`specwf/archive/<date>-<name>/\`
- \`state.md\` reflects archived status

### Step 5: Advance
Run \`specwf continue\` \u2014 if all phase changes are archived, routes to ship-phase.

## Output
- Updated \`specwf/specs/\` \u2014 global specs with merged delta-specs
- \`specwf/archive/<date>-<name>/\` \u2014 archived change directory
- Updated \`state.md\` \u2014 change marked as archived

## Guardrails
- **You are the orchestrator** \u2014 dispatch archiver, do not archive yourself
- Delta-spec merge must resolve conflicts, not overwrite
- Archived changes are never deleted \u2014 they form project decision history
- If archival fails, the change remains in its working directory \u2014 no data loss`;
function getArchiveSkillTemplate() {
  return {
    name: "specwf-archive",
    description: "Archive \u2014 dispatch archiver sub-agent for delta-spec merge + backfill",
    instructions: instructions14
  };
}
function getArchiveCommandTemplate() {
  return {
    name: "SpecWF: Archive",
    description: "Archive \u2014 dispatch archiver sub-agent for delta-spec merge + backfill",
    category: "Workflow",
    tags: ["specwf", "archive", "specs", "merge", "sub-agent"],
    content: instructions14
  };
}

// src/templates/workflows/ship.ts
var instructions15 = `## Input
- All phase changes archived (for phase ship)
- All milestones complete (for milestone ship)
- Git remote configured (for PR creation)

## Steps

### Step 1: Check state
Run \`specwf state\` to determine ship context (phase ship or milestone ship).

### Step 2: Get context
Run \`specwf context ship\` to read the phase/milestone summary.

### Step 3: Phase ship
Creates a PR summarizing all changes in the phase:
- Generates phase summary from all archived changes
- Creates PR via \`gh pr create\`
- Updates state.md: marks phase as shipped

### Step 4: Milestone ship
Publishes a release tag:
- Creates release tag (e.g. v0.1.0)
- Updates project.md version
- Updates state.md: marks milestone as shipped

## Output
- PR on GitHub (phase ship)
- Release tag (milestone ship)
- Updated \`state.md\` and \`project.md\`

## Guardrails
- Phase ship requires all changes in the phase to be archived
- Milestone ship requires all phases to be shipped
- Use \`specwf ship --dry-run\` to preview without creating PRs/tags`;
function getShipSkillTemplate() {
  return {
    name: "specwf-ship",
    description: "Ship \u2014 create PR + update state / release tag",
    instructions: instructions15
  };
}
function getShipCommandTemplate() {
  return {
    name: "SpecWF: Ship",
    description: "Ship \u2014 create PR + update state / release tag",
    category: "Workflow",
    tags: ["specwf", "ship", "release", "pr"],
    content: instructions15
  };
}

// src/templates/workflows/continue.ts
var instructions16 = `## Input
- \`specwf/state.md\` must exist and be valid
- Previous step must be complete (exit conditions met)

## Steps

### Step 1: Run continue
Run \`specwf continue\` to:
- Validate the current step's exit conditions
- Query the state machine for the next transition
- Output the next step's instructions inline

### Step 2: Execute the next step
The continue command outputs complete instructions for the next workflow step. Execute them directly \u2014 no need to read a separate command file.

### Step 3: Query specific change
Run \`specwf continue change <name>\` to query and advance a specific change.

## Output
Inline instructions for the next workflow step, including:
- Current position and context
- Next command name and slash command
- Whether sub-agents are needed
- Full step instructions (Input, Steps, Output, Guardrails)

## Guardrails
- Continue does NOT advance state if exit conditions are not met
- The output instructions are self-contained \u2014 the agent can execute without reading additional files
- After state advancement, the next continue call routes to the following step`;
function getContinueSkillTemplate() {
  return {
    name: "specwf-continue",
    description: "Auto-advance \u2014 read STATE and route to next step",
    instructions: instructions16
  };
}
function getContinueCommandTemplate() {
  return {
    name: "SpecWF: Continue",
    description: "Auto-advance \u2014 read STATE and route to next step",
    category: "Workflow",
    tags: ["specwf", "continue", "state-machine"],
    content: instructions16
  };
}

// src/templates/workflows/registry.ts
var WORKFLOW_REGISTRY = {
  init: { skill: getInitSkillTemplate, command: getInitCommandTemplate },
  grill: { skill: getGrillSkillTemplate, command: getGrillCommandTemplate },
  research: { skill: getResearchSkillTemplate, command: getResearchCommandTemplate },
  roadmap: { skill: getRoadmapSkillTemplate, command: getRoadmapCommandTemplate },
  milestone: { skill: getMilestoneSkillTemplate, command: getMilestoneCommandTemplate },
  discuss: { skill: getDiscussSkillTemplate, command: getDiscussCommandTemplate },
  "research-phase": { skill: getResearchPhaseSkillTemplate, command: getResearchPhaseCommandTemplate },
  split: { skill: getSplitSkillTemplate, command: getSplitCommandTemplate },
  adhoc: { skill: getAdhocSkillTemplate, command: getAdhocCommandTemplate },
  plan: { skill: getPlanSkillTemplate, command: getPlanCommandTemplate },
  apply: { skill: getApplySkillTemplate, command: getApplyCommandTemplate },
  review: { skill: getReviewSkillTemplate, command: getReviewCommandTemplate },
  verify: { skill: getVerifySkillTemplate, command: getVerifyCommandTemplate },
  archive: { skill: getArchiveSkillTemplate, command: getArchiveCommandTemplate },
  ship: { skill: getShipSkillTemplate, command: getShipCommandTemplate },
  continue: { skill: getContinueSkillTemplate, command: getContinueCommandTemplate }
};

// src/generators/omp-commands.ts
var STEP_DEFS = [
  { step: "init", name: "specwf:init", description: "Initialize specwf project structure and generate platform files", usesAgent: true, agents: ["researcher"] },
  { step: "grill", name: "specwf:grill", description: "Requirements exploration \u2014 detailed questioning until shared understanding", usesAgent: false, agents: [] },
  { step: "research", name: "specwf:research", description: "Project-level technical research \u2014 parallel multi-direction investigation", usesAgent: true, agents: ["researcher"] },
  { step: "roadmap", name: "specwf:roadmap", description: "Roadmap definition \u2014 split project into Milestones \xD7 Phases", usesAgent: false, agents: [] },
  { step: "milestone", name: "specwf:milestone", description: "Milestone management \u2014 switch/create milestones, set current phase", usesAgent: false, agents: [] },
  { step: "discuss", name: "specwf:discuss", description: "Phase discussion \u2014 capture implementation decisions into context.md", usesAgent: false, agents: [] },
  { step: "research-phase", name: "specwf:research-phase", description: "Phase research \u2014 implementation path investigation", usesAgent: true, agents: ["researcher"] },
  { step: "split", name: "specwf:split", description: "Change splitting \u2014 dependency graph + N changes", usesAgent: false, agents: [] },
  { step: "adhoc", name: "specwf:adhoc", description: "Create adhoc change \u2014 independent change unrelated to milestone/phase", usesAgent: false, agents: [] },
  { step: "plan", name: "specwf:plan", description: "Change design \u2014 technical design + task breakdown + delta-specs", usesAgent: true, agents: ["planner"] },
  { step: "apply", name: "specwf:apply", description: "Code implementation \u2014 TDD RED\u2192GREEN\u2192REFACTOR", usesAgent: true, agents: ["executor"] },
  { step: "review", name: "specwf:review", description: "Triple review \u2014 spec/quality/goal reviews in parallel", usesAgent: true, agents: ["reviewer"] },
  { step: "verify", name: "specwf:verify", description: "Test verification \u2014 diagnose root cause + route loopback", usesAgent: true, agents: ["verifier"] },
  { step: "archive", name: "specwf:archive", description: "Archive \u2014 delta-spec merge + code cognition backfill", usesAgent: false, agents: [] },
  { step: "ship", name: "specwf:ship", description: "Ship \u2014 create PR + update state / release tag", usesAgent: false, agents: [] },
  { step: "continue", name: "specwf:continue", description: "Auto-advance \u2014 read STATE and route to next step", usesAgent: false, agents: [] }
];
function generateSlashCommand(def, _config) {
  const entry = WORKFLOW_REGISTRY[def.step];
  const body = entry ? entry.command().content : fallbackBody(def);
  return `---
name: ${def.name}
description: ${def.description}
---

${body}
`;
}
function fallbackBody(def) {
  const agentsSection = def.usesAgent && def.agents.length > 0 ? `Dispatch \`specwf-${def.agents[0]}\` sub-agent via task tool.` : "This step does not use sub-agents.";
  return `# ${def.description}

## Input

- state.md status is correct
- All prerequisite steps are complete

## Steps

### Step 1: Check state
Run \`specwf state\` to verify current position.

### Step 2: Get context
Run \`specwf context ${def.step}\` to read the file manifest.

### Step 3: Execute
Run \`specwf ${def.step}\` to perform the step.

## Sub-agents

${agentsSection}

## Output

Check \`specwf state\` for updated status.

## Advance

Run \`specwf continue\` to proceed to the next step.
`;
}
function generateAllCommands(config) {
  return STEP_DEFS.map((def) => ({
    path: `.omp/commands/specwf-${def.step}.md`,
    content: generateSlashCommand(def, config)
  }));
}

// src/generators/omp-agents.ts
import { dirname } from "path";
import { fileURLToPath } from "url";

// src/templates/agents/index.ts
var PLANNER_PROMPT = `## Role

You are a **Change Design Specialist** for specwf.

Your core responsibility is to analyze proposals, design technical solutions, create executable task checklists, and pre-write delta-specs as quality contracts. Your output directly drives the executor's implementation.

- Design complete technical solutions including architecture, data flow, and component trees
- Break changes into independently committable task granularity
- Annotate TDD protocol requirements for each type:behavior task
- Pre-write delta-specs to ensure specification consistency
- NEVER reduce or simplify the user's decision scope

## Core Constraints

- All artifacts written to the specwf/ directory
- Use bash to invoke specwf CLI for state management
- Respect project.yml context field
- Follow conventions/ for coding standards
- All output files use English

## Execution Flow

### Step 1: Read project context and proposal
- Read specwf/project.yml for profile and workflow configuration
- Read the change's proposal.md for intent, scope, and must-haves
- Read specwf/specs/ for existing global specs
- Read specwf/conventions/ for coding standards

### Step 2: Design technical solution
- Design overall architecture based on proposal and context
- Consider at least 2 alternatives and compare
- Document the complete design in design.md using \`specwf template design\`

### Step 3: Break down into executable tasks
- Use tracer-bullet vertical slice principle
- First wave is typically an end-to-end skeleton
- Annotate each task's type and dependencies

### Step 4: Pre-write delta-specs
- Create spec files under specs/<domain>/
- Use SHALL/MUST/SHOULD/MAY keywords
- Ensure each spec item is testable

## Deviation Rules

1. **Scope reduction prohibition**: NEVER reduce user decision points to simplify implementation
2. **Spec gap fill**: Annotate missing specs as SPEC_GAP_FILL
3. **Task granularity**: behavior task \u2264 50 lines, refactor task \u2264 200 lines changed
4. **Alternative archiving**: Record rejected alternatives in design.md

## Output Requirements

- design.md \u2014 technical design with architecture, data flow, alternatives
- tasks.md \u2014 implementation checklist with TDD annotations
- specs/<domain>/spec.md \u2014 delta behavioral contracts

## Verification Criteria

- tasks.md covers all must_haves from proposal.md
- Each type:behavior task has a RED test description
- Delta-spec SHALL/MUST constraints are testable
- No circular dependencies between tasks`;
var EXECUTOR_PROMPT = `## Role

You are a **Code Implementation Specialist** for specwf.

Your core responsibility is to implement code according to tasks.md, strictly following TDD protocol (RED\u2192GREEN\u2192REFACTOR), and ensuring each commit is atomic and verifiable.

- Execute tasks in strict order, never skipping any task
- Follow TDD protocol: write failing test first, then implement, then refactor
- Ensure each commit is an independent atomic change
- Auto-fix bugs or missing code when discovered
- Pause and ask when encountering architecture-level changes

## Core Constraints

- All artifacts written to the specwf/ directory
- Use bash to invoke specwf CLI for state management
- Respect project.yml context field
- Follow conventions/ for project conventions
- All output files use English

## Execution Flow

### Step 1: Read task list
- Read tasks.md for current wave task list and order
- Read design.md for technical approach
- Read delta-specs for specification constraints

### Step 2: Execute by type

**type:behavior \u2192 TDD three-step protocol**
1. **RED**: Write a failing test \u2014 test must be runnable and fail on assertion
   Commit: \`test(<scope>): RED - <description>\`
2. **GREEN**: Write minimal implementation to pass the test \u2014 only what's needed
   Commit: \`feat(<scope>): GREEN - <description>\`
3. **REFACTOR**: Improve code quality without changing behavior
   Commit: \`refactor(<scope>): REFACTOR - <description>\`

**type:config** \u2014 direct implementation, single commit: \`config(<scope>): <description>\`
**type:refactor** \u2014 verify tests pass first, then refactor: \`refactor(<scope>): <description>\`
**type:docs** \u2014 documentation update: \`docs(<scope>): <description>\`
**type:scaffolding** \u2014 skeleton code: \`chore(<scope>): <description>\`

### Step 3: Per-task verification
- Run related tests, confirm no regressions
- Confirm delta-spec constraints are satisfied

### Step 4: Wave completion
- Confirm all wave tasks complete
- Run full test suite

## Deviation Rules

1. **auto-fix**: Auto-fix bugs discovered in code, annotate [auto-fix]
2. **auto-add**: Auto-add missing helper code, annotate [auto-add]
3. **auto-fix-blocking**: Attempt auto-fix for build/dependency issues up to 3 times, then pause
4. **ask-architectural**: Pause and describe architectural changes for confirmation

**Analysis paralysis guard**: After 5 consecutive reads without a write, stop and diagnose what's blocking.

## Output
- Code changes per tasks.md
- Tests co-located with source files (*.test.ts)
- Atomic git commits in Conventional Commits format

## Verification
- All type:behavior tests pass (RED\u2192GREEN\u2192REFACTOR complete)
- Implementation matches delta-spec SHALL/MUST
- Each commit is atomic, commit messages conform to spec`;
var REVIEWER_PROMPT = `## Role

You are a **Triple Review Specialist** for specwf.

Your core responsibility is to perform three parallel reviews on implemented code: spec compliance, code quality, and goal achievement. You are the first line of quality gating.

## Core Constraints

- All artifacts written to the specwf/ directory
- Use bash to invoke specwf CLI for state management
- All output files use English

## Execution Flow

### Step 1: Read context
- Read proposal.md, delta-specs, design.md, tasks.md, conventions/

### Step 2: Spec compliance review (spec-review.md)
- Check each SHALL/MUST in delta-specs against implementation
- Annotate: PASS / FAIL / NOT_APPLICABLE with file:line references

### Step 3: Code quality review (quality-review.md)
- Bug patterns, security vulnerabilities, code conventions, common AI mistakes
- Severity: BLOCKER / MAJOR / MINOR / INFO

### Step 4: Goal achievement review (goal-review.md)
- Cross-reference proposal.md goals: ACHIEVED / PARTIAL / NOT_ACHIEVED

### Step 5: Output
- Three independent reports with overall conclusion: PASS / FAIL / NEEDS_REVISION

## Deviation Rules
1. Any BLOCKER \u2192 overall FAIL (unless report-only mode)
2. Parallel execution possible, unified conclusion required
3. Every issue must cite specific file:line references`;
var VERIFIER_PROMPT = `## Role

You are a **Test Verification Specialist** for specwf.

Your core responsibility is to verify that implemented changes meet their goals. Run the full test suite, diagnose failures to root cause, and verify TDD commit integrity.

## Core Constraints

- All artifacts written to the specwf/ directory
- All output files use English

## Execution Flow

### Step 1: Read context
- Read delta-specs, tasks.md, review reports

### Step 2: Run test suite
- Execute all tests, diagnose any failures to root cause

### Step 3: Verify coverage
- Each delta-spec SHALL/MUST has a passing test
- TDD commit integrity: RED\u2192GREEN\u2192REFACTOR sequence for type:behavior

### Step 4: Output VERIFICATION.md
Status: passed | gaps_found | human_needed

## Routing
- passed \u2192 archive
- gaps_found \u2192 reapply or replan
- human_needed \u2192 surface to user with specific questions`;
var ARCHIVER_PROMPT = `## Role

You are an **Archive Specialist** for specwf.

Your core responsibility is to merge delta-specs into global specs, run code cognition backfill, and move completed changes to the archive.

## Core Constraints

- All artifacts written to the specwf/ directory
- All output files use English

## Execution Flow

### Step 1: Read context
- Read the change directory and global specs/

### Step 2: Merge delta-specs
- Merge changes/<name>/specs/ into global specs/
- New specs append, modified specs update, removed specs archive

### Step 3: Code cognition backfill
- Update context.md with learned patterns from this change

### Step 4: Move to archive
- Move change to specwf/archive/<date>-<name>/
- Update state.md: mark change as archived

## Guardrails
- Delta-spec merge must resolve conflicts, not overwrite
- Archived changes are never deleted \u2014 they form project decision history`;
var RESEARCHER_PROMPT = `## Role

You are a **Technical Researcher** for specwf.

Your core responsibility is to investigate technical directions, compare alternatives, and produce structured research outputs.

## Core Constraints

- All artifacts written to the specwf/ directory
- Read-only analysis \u2014 never modify source code
- All output files use English

## Execution Flow

### Step 1: Read context
- Read requirements.md for research scope
- Read project.yml for technical constraints

### Step 2: Research
- Compare at least 2 candidate solutions per direction
- Assess feasibility, risk, and trade-offs
- Produce a recommended approach with rationale

### Step 3: Output
- stack.md \u2014 tech stack recommendations
- architecture.md \u2014 architecture approach
- pitfalls.md \u2014 known risks and mitigations

## Guardrails
- Never recommend the first option found without comparison
- Mark speculative findings with confidence levels`;
var PHASE_RESEARCHER_PROMPT = `## Role

You are a **Phase Researcher** for specwf.

Your core responsibility is to investigate implementation paths for a specific phase, building on context.md decisions and parent project research.

## Core Constraints

- All artifacts written to the specwf/ directory
- All output files use English

## Execution Flow

### Step 1: Read context
- Read context.md for locked decisions and discretion areas
- Read related specs/ for existing behavioral contracts

### Step 2: Research
- Investigate concrete implementation approaches
- Identify reusable patterns from existing codebase
- Flag known pitfalls and edge cases

### Step 3: Output research.md
- Recommended paths with rationale
- Known pitfalls and TDD implications`;
var CODEBASE_MAPPER_PROMPT = `## Role

You are a **Codebase Mapper** for specwf.

Your core responsibility is to analyze existing (brownfield) codebases and produce structured technical reports.

## Core Constraints

- Read-only analysis \u2014 never modify source code
- All output files use English

## Execution Flow

### Step 1: Scan codebase
- Analyze directory structure, package.json, config files
- Identify tech stack, frameworks, and dependencies

### Step 2: Analyze architecture
- Map module structure and dependencies
- Identify architectural patterns in use

### Step 3: Extract conventions
- Naming patterns, code style, directory conventions

### Step 4: Identify pitfalls
- Anti-patterns, technical debt, risky areas

### Step 5: Output
- research/stack.md, research/architecture.md
- conventions/codebase-conventions.md
- research/pitfalls.md`;
var SPEC_BOOTSTRAPPER_PROMPT = `## Role

You are a **Spec Bootstrapper** for specwf.

Your core responsibility is to extract behavioral contracts from existing code \u2014 code signatures, comments, and tests \u2014 and produce initial spec files.

## Core Constraints

- Read-only analysis \u2014 never modify source code
- All output files use English

## Execution Flow

### Step 1: Scan codebase
- Scan src/ to identify core modules
- Read function signatures, JSDoc comments, and existing tests

### Step 2: Extract behavioral contracts
- Infer SHALL/MUST constraints from tests and signatures
- Annotate with confidence levels (HIGH/MEDIUM/LOW)

### Step 3: Output specs/<domain>/spec.md
- Mark all entries as BOOTSTRAPPED
- Low-confidence entries flagged for human review`;
var AGENT_PROMPTS = {
  planner: PLANNER_PROMPT,
  executor: EXECUTOR_PROMPT,
  reviewer: REVIEWER_PROMPT,
  verifier: VERIFIER_PROMPT,
  archiver: ARCHIVER_PROMPT,
  researcher: RESEARCHER_PROMPT,
  "phase-researcher": PHASE_RESEARCHER_PROMPT,
  "codebase-mapper": CODEBASE_MAPPER_PROMPT,
  "spec-bootstrapper": SPEC_BOOTSTRAPPER_PROMPT
};

// src/generators/omp-agents.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var AGENT_DEFS = [
  // specwf-researcher
  {
    role: "researcher",
    description: "Technical research \u2014 produce STACK/ARCH/PITFALLS/RESEARCH docs",
    tools: ["read", "grep", "glob", "lsp", "web_search", "write", "bash"],
    spawns: "*"
  },
  // specwf-planner
  {
    role: "planner",
    description: "Change design \u2014 produce proposal/design/tasks/delta-specs",
    tools: ["read", "grep", "glob", "lsp", "write", "bash"],
    spawns: "*"
  },
  // specwf-executor
  {
    role: "executor",
    description: "Code implementation \u2014 TDD RED\u2192GREEN\u2192REFACTOR",
    tools: ["read", "edit", "write", "bash", "grep", "glob", "lsp", "ast_grep", "ast_edit"],
    spawns: "*"
  },
  // specwf-reviewer
  {
    role: "reviewer",
    description: "Triple review \u2014 spec review + quality review + goal review",
    tools: ["read", "grep", "glob", "lsp", "ast_grep", "bash"],
    spawns: "*"
  },
  // specwf-verifier
  {
    role: "verifier",
    description: "Test verification \u2014 diagnose + route loopback",
    tools: ["read", "bash", "grep", "glob", "lsp", "edit", "write"],
    spawns: "*"
  },
  // specwf-archiver
  {
    role: "archiver",
    description: "Archive \u2014 delta-spec merge + code cognition backfill",
    tools: ["read", "write", "bash", "grep", "glob", "lsp"],
    spawns: "*"
  },
  // specwf-phase-researcher
  {
    role: "phase-researcher",
    description: "Phase research \u2014 produce RESEARCH.md for planner",
    tools: ["read", "grep", "glob", "lsp", "write", "bash"],
    spawns: "*"
  },
  // specwf-codebase-mapper + specwf-spec-bootstrapper (combined as aux agents)
  {
    role: "codebase-mapper",
    description: "Codebase mapping \u2014 analyze existing code, produce technical reports",
    tools: ["read", "grep", "glob", "lsp", "write", "bash"],
    spawns: "*"
  }
];
function resolveAgentModel(role, config) {
  return resolveModels(config)[role] ?? "default";
}
function resolveThinkingLevel(role) {
  const highThinkingRoles = ["planner", "researcher", "reviewer"];
  return highThinkingRoles.includes(role) ? "high" : "medium";
}
function generateAgent(def, model) {
  const thinkingLevel = resolveThinkingLevel(def.role);
  const body = AGENT_PROMPTS[def.role] ?? `# ${def.description}

Agent system prompt for specwf-${def.role}.`;
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
function skillName(step) {
  return `specwf-${step}`;
}
function skillDescription(step) {
  const map = {
    init: "Initialize specwf project structure, generate platform files",
    grill: "Requirements exploration \u2014 detailed questioning until shared understanding is reached",
    research: "Project-level technical research \u2014 parallel multi-direction investigation",
    roadmap: "Roadmap definition \u2014 split project into Milestones \xD7 Phases",
    milestone: "Milestone management \u2014 switch/create milestones, set current phase",
    discuss: "Phase discussion \u2014 capture implementation decisions into context.md",
    "research-phase": "Phase research \u2014 implementation path investigation",
    split: "Change splitting \u2014 dependency graph + N changes",
    adhoc: "Create adhoc change \u2014 independent change unrelated to milestone/phase",
    plan: "Change design \u2014 technical design + task breakdown + delta-specs",
    apply: "Code implementation \u2014 TDD RED\u2192GREEN\u2192REFACTOR",
    review: "Triple review \u2014 spec review, quality review, goal review in parallel",
    verify: "Test verification \u2014 diagnose root cause + route loopback",
    archive: "Archive \u2014 delta-spec merge + code cognition backfill",
    ship: "Ship \u2014 create PR + update state / release tag",
    continue: "Auto-advance \u2014 read STATE and route to next step"
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
  const entry = WORKFLOW_REGISTRY[def.step];
  const body = entry ? entry.skill().instructions : `# ${def.description}

Workflow guide for the \`${def.step}\` step.`;
  return `---
name: ${def.name}
description: ${def.description}
hide: false
---

${body}
`;
}
function generateAllSkills(_config) {
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

// src/commands/specwf-init.ts
function register(program2) {
  program2.command("init").description("\u521D\u59CB\u5316 specwf \u9879\u76EE\u7ED3\u6784").option("--dir <path>", "\u76EE\u6807\u76EE\u5F55", ".").option("--profile <profile>", "\u5DE5\u4F5C\u6D41\u4E25\u683C\u5EA6 (lite|standard|strict)", "standard").option("--brownfield", "\u5B58\u91CF\u9879\u76EE\u6A21\u5F0F\uFF08codebase mapping + spec bootstrap\uFF09").option("--yes", "\u8DF3\u8FC7\u786E\u8BA4\u4F7F\u7528\u9ED8\u8BA4\u503C").action(initHandler);
}
async function initHandler(options) {
  const baseDir = options.dir.startsWith("/") ? options.dir : join6(process.cwd(), options.dir);
  const specwfDir = join6(baseDir, "specwf");
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
    console.log("\u2713 \u5DF2\u626B\u63CF\u9879\u76EE\u7ED3\u6784\u3002\u8BF7\u6D3E\u53D1 specwf-codebase-mapper \u548C specwf-spec-bootstrapper \u5B50\u4EE3\u7406\u5B8C\u6210\u5B8C\u6574\u5206\u6790\u3002");
  }
  console.log("specwf \u521D\u59CB\u5316\u5B8C\u6210\u3002");
  try {
    const files = generateAll({ version: 1, platform, profile, context: wizard.context, workflow: {}, review: {}, change: {}, git: { branching: "none", create_tag: true }, conventions: { inject: true }, models: {} });
    writeGeneratedFiles(files);
    console.log(`\u2713 \u5E73\u53F0\u6587\u4EF6\u5DF2\u751F\u6210 (${files.length} \u4E2A)`);
  } catch {
    console.log("\u26A0 \u5E73\u53F0\u6587\u4EF6\u751F\u6210\u5931\u8D25\uFF0C\u53EF\u7A0D\u540E\u8FD0\u884C `specwf update` \u91CD\u8BD5");
  }
}

// src/commands/specwf-update.ts
import { join as join7 } from "path";
function register2(program2) {
  program2.command("update").description("\u66F4\u65B0\u5E73\u53F0\u6587\u4EF6\uFF08commands + agents\uFF09").option("--dir <path>", "specwf \u76EE\u5F55", "specwf").action(updateHandler);
}
function updateHandler(options) {
  const specwfDir = join7(process.cwd(), options.dir);
  const config = loadConfig(specwfDir);
  const files = generateAll(config);
  console.log("\u6B63\u5728\u66F4\u65B0\u5E73\u53F0\u6587\u4EF6...");
  writeGeneratedFiles(files);
  console.log(`\u2713 \u66F4\u65B0\u5B8C\u6210 (${files.length} \u4E2A\u6587\u4EF6)`);
}

// src/commands/specwf-config.ts
import { join as join8 } from "path";
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
  return join8(process.cwd(), "specwf");
}

// src/commands/specwf-state.ts
import { join as join10 } from "path";

// src/core/state-validator.ts
import { existsSync as existsSync6, readFileSync as readFileSync6, readdirSync as readdirSync3 } from "fs";
import { join as join9 } from "path";
var EXIT_CRITERIA = [
  // milestone/active → 必须有 requirements.md（grill 产出后才能推进）
  {
    type: "milestone",
    step: "active",
    checks: [
      { path: "requirements.md", description: "requirements.md \u4E0D\u5B58\u5728" }
    ]
  },
  // project/requirements-defined → 必须有完整的 requirements.md
  {
    type: "project",
    step: "requirements-defined",
    checks: [
      { path: "requirements.md", description: "requirements.md \u5185\u5BB9\u4E3A\u6A21\u677F\uFF0C\u8BF7\u586B\u5199\u540E\u91CD\u8BD5" }
    ]
  },
  // project/researched → 必须有调研产出
  {
    type: "project",
    step: "researched",
    checks: [
      { path: "research/summary.md", description: "research/summary.md \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5B8C\u6210\u8C03\u7814" }
    ]
  },
  // phase/discuss → 必须先产出 context.md
  {
    type: "phase",
    step: "discuss",
    checks: [
      { path: "context.md", description: "context.md \u4E0D\u5B58\u5728\u6216\u4E3A\u6A21\u677F\u7A7A\u58F3\u3002\u8BF7\u5148\u5B8C\u6210 discuss \u6B65\u9AA4\u3002" }
    ]
  },
  // phase/research → 必须有 phase 调研报告
  {
    type: "phase",
    step: "research",
    checks: [
      { path: "research.md", description: "research.md \u4E0D\u5B58\u5728\u6216\u4E3A\u6A21\u677F\u7A7A\u58F3\u3002\u8BF7\u5148\u5B8C\u6210 research-phase \u6B65\u9AA4\u3002" }
    ]
  },
  // adhoc/proposal → proposal.md 不能是模板
  {
    type: "adhoc",
    step: "proposal",
    checks: [
      { path: "changes/", description: "change \u7684 proposal.md \u4E3A\u6A21\u677F\u7A7A\u58F3\uFF0C\u8BF7\u586B\u5199\u540E\u91CD\u8BD5" }
    ]
  },
  // change/planning → design.md + tasks.md 不能是模板
  {
    type: "change",
    step: "planning",
    checks: [
      { path: "changes/", description: "design.md \u6216 tasks.md \u4E3A\u6A21\u677F\u7A7A\u58F3\uFF0C\u8BF7\u586B\u5199\u540E\u91CD\u8BD5" }
    ]
  }
];
function isTemplateFile(filePath) {
  try {
    const content = readFileSync6(filePath, "utf-8");
    const placeholders = content.match(/\{\{[a-zA-Z_-]+\}\}/g);
    return (placeholders?.length ?? 0) > 3;
  } catch {
    return false;
  }
}
function findChangeDir(specwfDir) {
  const changesDir = join9(specwfDir, "changes");
  if (!existsSync6(changesDir)) return [];
  try {
    return readdirSync3(changesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}
function checkExitCondition(specwfDir, check, resolvedPath) {
  const fullPath = resolvedPath ?? join9(specwfDir, check.path);
  if (check.path.endsWith("/") || check.description.includes("\u7684 ")) {
    const changes = findChangeDir(specwfDir);
    for (const change of changes) {
      for (const doc of ["proposal.md", "design.md", "tasks.md"]) {
        const docPath = join9(specwfDir, "changes", change, doc);
        if (existsSync6(docPath) && isTemplateFile(docPath)) {
          return `changes/${change}/${doc} \u4ECD\u4E3A\u6A21\u677F\u7A7A\u58F3\uFF0C\u8BF7\u586B\u5199\u540E\u91CD\u8BD5`;
        }
      }
    }
    return null;
  }
  if (!existsSync6(fullPath)) {
    return check.description;
  }
  if (isTemplateFile(fullPath)) {
    return check.description;
  }
  return null;
}
function validateStepAdvance(contextType, contextStep, ref, cwd) {
  const specwfDir = join9(cwd, "specwf");
  const criteria = EXIT_CRITERIA.find(
    (c) => c.type === contextType && c.step === contextStep
  );
  if (!criteria) {
    return { valid: true, errors: [] };
  }
  const errors = [];
  for (const check of criteria.checks) {
    const resolvedPath = ref && !check.path.startsWith("changes/") && existsSync6(join9(specwfDir, ref, check.path)) ? join9(specwfDir, ref, check.path) : join9(specwfDir, check.path);
    const error = checkExitCondition(specwfDir, check, resolvedPath);
    if (error) {
      errors.push(error);
    }
  }
  return { valid: errors.length === 0, errors };
}

// src/commands/specwf-state.ts
function register4(program2) {
  const cmd = program2.command("state").description("\u67E5\u770B/\u4FEE\u6539\u5F53\u524D\u72B6\u6001");
  cmd.command("show").description("\u67E5\u770B\u5F53\u524D\u72B6\u6001").action(showState);
  cmd.command("set-milestone <id>").description("\u5207\u6362\u5230\u6307\u5B9A milestone").action(setMilestone);
  cmd.command("set-phase <id>").description("\u5207\u6362\u5230\u6307\u5B9A phase").action(setPhase);
  cmd.command("set-step <step>").description("\u8BBE\u7F6E\u5F53\u524D\u6B65\u9AA4").action(setStep);
  cmd.action(showState);
}
function findSpecwfDir2() {
  return join10(process.cwd(), "specwf");
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
  const pendingChanges = state.changes.filter((c) => c.status !== "archived");
  const pendingAdhoc = state.adhoc.filter((c) => c.status !== "archived");
  const hasPending = pendingChanges.length > 0 || pendingAdhoc.length > 0;
  if (hasPending) {
    console.log("");
    console.log("\u5F85\u5904\u7406:");
    if (pendingChanges.length > 0) {
      console.log(`  Change (${pendingChanges.length}):`);
      for (const c of pendingChanges) {
        console.log(`    - ${c.name} [${c.status}]`);
      }
    }
    if (pendingAdhoc.length > 0) {
      console.log(`  \u4E34\u65F6 Change (${pendingAdhoc.length}):`);
      for (const c of pendingAdhoc) {
        console.log(`    - ${c.name} [${c.status}]`);
      }
    }
  }
  console.log("\u2500".repeat(50));
}
function setMilestone(id) {
  const specwfDir = findSpecwfDir2();
  const currentState = loadState(specwfDir);
  const prevMilestone = currentState.project.current_milestone;
  if (prevMilestone && prevMilestone !== id && currentState.project.status !== "milestone-shipped") {
    const archived = archiveMilestoneDir(specwfDir, prevMilestone);
    console.log(`\u2713 \u5F52\u6863\u4E0A\u4E00\u91CC\u7A0B\u7891: ${prevMilestone} \u2192 ${archived}`);
  }
  updateState(specwfDir, (state) => {
    state.project.current_milestone = id;
    state.project.current_phase = null;
    state.active_context.type = "milestone";
    state.active_context.ref = `milestones/${id}`;
    state.active_context.step = "active";
    state.project.status = "milestone-active";
  });
  console.log(`\u2713 \u5207\u6362\u5230 milestone: ${id}\uFF08\u72B6\u6001: milestone-active\uFF09`);
  console.log("\u2192 \u4E0B\u4E00\u6B65: \u5B9A\u4E49\u91CC\u7A0B\u7891\u9700\u6C42: /specwf:grill");
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
  const state = loadState(specwfDir);
  const ctx = state.active_context;
  let currentStatus;
  switch (ctx.type) {
    case "project":
      currentStatus = state.project.status;
      break;
    case "milestone":
      currentStatus = "milestone-active";
      break;
    case "phase":
      currentStatus = `phase-${ctx.step}`;
      break;
    case "change":
      currentStatus = `change-${ctx.step}`;
      break;
    case "adhoc":
      currentStatus = `adhoc-${ctx.step}`;
      break;
    default:
      currentStatus = state.project.status;
  }
  const result = validateStepAdvance(ctx.type, ctx.step, ctx.ref, process.cwd());
  if (!result.valid) {
    console.log("\u2500".repeat(50));
    console.log("\u274C \u524D\u7F6E\u6761\u4EF6\u672A\u6EE1\u8DB3\uFF0C\u65E0\u6CD5\u63A8\u8FDB:");
    for (const err of result.errors) {
      console.log(`   \u2022 ${err}`);
    }
    ;
    console.log("\u2500".repeat(50));
    return;
  }
  updateState(specwfDir, (state2) => {
    state2.active_context.step = step;
  });
  console.log(`\u2713 \u5F53\u524D\u6B65\u9AA4: ${step}`);
}

// src/commands/specwf-context.ts
import { join as join12 } from "path";

// src/core/spec-injector.ts
import { join as join11 } from "path";
import { readdirSync as readdirSync4, existsSync as existsSync7, statSync as statSync2 } from "fs";
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
  if (existsSync7(join11(specwfDir, "requirements.md"))) {
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
  const specsDir = join11(specwfDir, "specs");
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
  const convDir = join11(specwfDir, "conventions");
  if (!existsSync7(convDir)) return [];
  return readdirSync4(convDir).filter((f) => f.endsWith(".md")).map((f) => ({ path: `conventions/${f}`, description: "\u9879\u76EE\u7EA6\u5B9A" }));
}
function getChangeArtifacts(specwfDir, state) {
  const ref = state.active_context.ref;
  if (!ref) return [];
  const changeDir = join11(specwfDir, ref);
  if (!existsSync7(changeDir)) return [];
  const artifacts = [];
  for (const file of ["proposal.md", "design.md", "tasks.md", ".specwf.yaml"]) {
    const fullPath = join11(changeDir, file);
    if (existsSync7(fullPath)) {
      artifacts.push({ path: `${ref}/${file}`, description: "change \u4EA7\u7269" });
    }
  }
  const specsDir = join11(changeDir, "specs");
  if (existsSync7(specsDir)) {
    const deltaSpecs = listSpecFiles(specsDir, `${ref}/specs`);
    artifacts.push(...deltaSpecs);
  }
  return artifacts;
}
function listSpecFiles(dir, prefix) {
  if (!existsSync7(dir)) return [];
  const results = [];
  for (const entry of readdirSync4(dir)) {
    const fullPath = join11(dir, entry);
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
  const specwfDir = join12(process.cwd(), "specwf");
  const result = generateContext(specwfDir, step);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatContextTerminal(result));
  }
}

// src/commands/specwf-continue.ts
import { join as join13 } from "path";

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
  { from: "change-verifying", command: "archive", to: "change-archiving", slashCommand: "/specwf:archive", subagent: true },
  { from: "change-archiving", command: "archive-done", to: "change-archived", slashCommand: "" },
  // 回环
  { from: "change-verifying", command: "replan", to: "change-planning", slashCommand: "/specwf:plan", subagent: true },
  { from: "change-verifying", command: "reapply", to: "change-applying", slashCommand: "/specwf:apply", subagent: true },
  { from: "change-reviewing", command: "fix", to: "change-applying", slashCommand: "/specwf:apply", subagent: true },
  // Milestone 层（新里程碑 = 项目流程 - init）
  { from: "milestone-active", command: "grill", to: "requirements-defined", slashCommand: "/specwf:grill" },
  // Ship
  { from: "change-archived", command: "ship-phase", to: "phase-shipped", slashCommand: "/specwf:ship" },
  { from: "phase-shipped", command: "next-phase", to: "phase-discuss", slashCommand: "/specwf:discuss" },
  { from: "phase-shipped", command: "ship-milestone", to: "milestone-shipped", slashCommand: "/specwf:ship" },
  // 临时 change
  { from: "adhoc-proposal", command: "plan", to: "change-planning", slashCommand: "/specwf:plan", subagent: true },
  { from: "change-archived", command: "adhoc-done", to: "adhoc-archived", slashCommand: "" },
  { from: "adhoc-archived", command: "new-change", to: "adhoc-proposal", slashCommand: "" }
];

// src/core/state-machine.ts
function getTransition(from, command) {
  return STATE_TRANSITIONS.find(
    (t) => t.from === from && t.command === command
  ) ?? null;
}
function getNextSteps(from) {
  return STATE_TRANSITIONS.filter((t) => t.from === from);
}

// src/core/continue.ts
function determineNextStep(specwfDir) {
  return determineFromState(loadState(specwfDir));
}
function determineChangeNextStep(specwfDir, changeName) {
  const state = loadState(specwfDir);
  const change = state.changes.find((c) => c.name === changeName);
  if (change) {
    return determineFromChangeStatus(changeName, `change-${change.status}`, "change");
  }
  const adhoc = state.adhoc.find((c) => c.name === changeName);
  if (adhoc) {
    const prefix = adhoc.status === "proposal" ? "adhoc" : "change";
    return determineFromChangeStatus(
      changeName,
      `${prefix}-${adhoc.status}`,
      "adhoc"
    );
  }
  return {
    error: `change \u4E0D\u5B58\u5728: ${changeName}\u3002\u53EF\u7528: ${listAvailableChanges(state)}`
  };
}
var STEP_INFO = {
  grill: {
    command: "grill",
    description: "\u901A\u8FC7\u9010\u6761\u63D0\u95EE\u6536\u96C6\u9700\u6C42\uFF0C\u4EA7\u51FA requirements.md",
    artifacts: ["specwf/requirements.md"],
    fileRef: ".omp/commands/specwf-grill.md"
  },
  research: {
    command: "research",
    description: "\u5E76\u884C\u8C03\u7814\u6280\u672F\u65B9\u5411\u548C\u67B6\u6784\u65B9\u6848",
    artifacts: ["specwf/research/stack.md", "specwf/research/architecture.md", "specwf/research/pitfalls.md", "specwf/research/summary.md"],
    fileRef: ".omp/commands/specwf-research.md"
  },
  "research-done": {
    command: "research-done",
    description: "\u6807\u8BB0\u8C03\u7814\u5B8C\u6210\uFF0C\u8FDB\u5165\u8DEF\u7EBF\u56FE\u62C6\u5206",
    artifacts: [],
    fileRef: ""
  },
  roadmap: {
    command: "roadmap",
    description: "\u5C06\u9879\u76EE\u62C6\u5206\u4E3A Milestone \xD7 Phase",
    artifacts: ["specwf/roadmap.md"],
    fileRef: ".omp/commands/specwf-roadmap.md"
  },
  discuss: {
    command: "discuss",
    description: "Phase \u8BA8\u8BBA\uFF0C\u6355\u83B7\u5B9E\u73B0\u51B3\u7B56",
    artifacts: ["milestones/<ms>/phases/<ph>/context.md"],
    fileRef: ".omp/commands/specwf-discuss.md"
  },
  "research-phase": {
    command: "research-phase",
    description: "\u5BF9\u5F53\u524D phase \u8FDB\u884C\u6280\u672F\u8C03\u7814",
    artifacts: ["milestones/<ms>/phases/<ph>/research.md"],
    fileRef: ".omp/commands/specwf-research-phase.md"
  },
  split: {
    command: "split",
    description: "\u5C06 phase \u62C6\u5206\u4E3A\u591A\u4E2A change\uFF0C\u786E\u5B9A\u4F9D\u8D56\u56FE",
    artifacts: ["specwf/roadmap.md\uFF08\u66F4\u65B0\uFF09"],
    fileRef: ".omp/commands/specwf-split.md"
  },
  plan: {
    command: "plan",
    description: "Change \u8BBE\u8BA1\uFF1A\u8BBE\u8BA1\u6280\u672F\u65B9\u6848\u3001\u62C6\u5206\u4EFB\u52A1\u3001\u9884\u5199 delta-specs",
    artifacts: ["design.md", "tasks.md", "specs/<domain>/spec.md"],
    fileRef: ".omp/commands/specwf-plan.md"
  },
  apply: {
    command: "apply",
    description: "\u6309 tasks.md \u5B9E\u73B0\u4EE3\u7801\uFF0Ctype:behavior \u8D70 RED\u2192GREEN\u2192REFACTOR",
    artifacts: ["\u4EE3\u7801\u53D8\u66F4", "\u6D4B\u8BD5"],
    fileRef: ".omp/commands/specwf-apply.md"
  },
  review: {
    command: "review",
    description: "\u4E09\u91CD\u5BA1\u67E5\uFF1A\u89C4\u683C\u5BA1\u67E5 + \u8D28\u91CF\u5BA1\u67E5 + \u76EE\u6807\u5BA1\u67E5",
    artifacts: ["REVIEW.md"],
    fileRef: ".omp/commands/specwf-review.md"
  },
  verify: {
    command: "verify",
    description: "\u8FD0\u884C\u6D4B\u8BD5\uFF0C\u8BCA\u65AD\u6839\u56E0\uFF0C\u8DEF\u7531\u56DE\u73AF",
    artifacts: ["VERIFICATION.md"],
    fileRef: ".omp/commands/specwf-verify.md"
  },
  archive: {
    command: "archive",
    description: "Delta-spec \u5408\u5E76 + \u4EE3\u7801\u8BA4\u77E5\u56DE\u704C + \u76EE\u5F55\u5F52\u6863",
    artifacts: ["archive/<change-id>/"],
    fileRef: ".omp/commands/specwf-archive.md"
  },
  "ship-phase": {
    command: "ship-phase",
    description: "\u521B\u5EFA PR + \u66F4\u65B0 state.md",
    artifacts: ["GitHub PR", "state.md \u66F4\u65B0"],
    fileRef: ".omp/commands/specwf-ship.md"
  },
  "ship-milestone": {
    command: "ship-milestone",
    description: "\u53D1\u5E03 release tag + \u66F4\u65B0\u7248\u672C\u53F7",
    artifacts: ["git tag", "RELEASE.md", "npm publish"],
    fileRef: ".omp/commands/specwf-ship.md"
  }
};
var STEP_TO_WORKFLOW = {
  grill: "grill",
  research: "research",
  roadmap: "roadmap",
  discuss: "discuss",
  "research-phase": "research-phase",
  split: "split",
  plan: "plan",
  apply: "apply",
  review: "review",
  verify: "verify",
  archive: "archive",
  "ship-phase": "ship",
  "ship-milestone": "ship",
  init: "init",
  adhoc: "adhoc",
  continue: "continue",
  milestone: "milestone"
};
function getStepInfo(command) {
  const info = STEP_INFO[command];
  if (!info) return void 0;
  const wfStep = STEP_TO_WORKFLOW[command];
  if (wfStep && WORKFLOW_REGISTRY[wfStep]) {
    return {
      ...info,
      instructions: WORKFLOW_REGISTRY[wfStep].command().content
    };
  }
  return info;
}
function determineFromChangeStatus(name, statusKey, type) {
  const available = getNextSteps(statusKey);
  const availableSteps = available.map((t) => ({
    command: t.command,
    slashCommand: t.slashCommand,
    subagent: t.subagent ?? false
  }));
  const first = available[0];
  const stepInfo = first ? getStepInfo(first.command) : void 0;
  return {
    currentStep: statusKey,
    context: `${type === "adhoc" ? "Adhoc Change" : "Change"} (${name})`,
    nextCommand: first?.command ?? null,
    slashCommand: first?.slashCommand || null,
    needsSubagent: first?.subagent ?? false,
    availableSteps,
    hint: available.length === 0 ? "This change has no available next steps. Create a new change to continue." : null,
    nextStepInfo: stepInfo,
    instructions: stepInfo?.instructions
  };
}
function listAvailableChanges(state) {
  const names = [
    ...state.changes.map((c) => c.name),
    ...state.adhoc.map((c) => c.name)
  ];
  return names.join(", ") || "(\u65E0)";
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
  const stepInfo = first ? getStepInfo(first.command) : void 0;
  return {
    currentStep: ctx.step,
    context: formatContext2(state),
    nextCommand: first?.command ?? null,
    slashCommand: first?.slashCommand || null,
    needsSubagent: first?.subagent ?? false,
    availableSteps,
    hint,
    nextStepInfo: stepInfo,
    instructions: stepInfo?.instructions
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
    const pendingAdhoc = state.adhoc.filter((c) => c.status !== "archived");
    const hintParts = ["\u5F53\u524D milestone \u5DF2\u5B8C\u6210\u3002\u521B\u5EFA\u65B0 milestone: specwf state set-milestone <id>"];
    if (pendingAdhoc.length > 0) {
      hintParts.push(
        `\u5F85\u5904\u7406\u7684\u4E34\u65F6 change: ${pendingAdhoc.map((c) => c.name).join(", ")}\u3002\u4F7F\u7528: specwf continue change <name>`
      );
    }
    return hintParts.join("\n    ");
  }
  if (status === "phase-shipped") {
    return "\u5F53\u524D phase \u5DF2\u5B8C\u6210\u3002\u521B\u5EFA\u65B0 phase \u6216\u5207\u6362: specwf state set-milestone <id>";
  }
  return null;
}

// src/commands/specwf-continue.ts
function register6(program2) {
  const cmd = program2.command("continue").description("\u81EA\u52A8\u63A8\u8FDB\u5230\u4E0B\u4E00\u6B65\uFF08\u68C0\u67E5\u524D\u7F6E\u6761\u4EF6 \u2192 \u66F4\u65B0\u72B6\u6001 \u2192 \u8F93\u51FA\u4E0B\u4E00\u6B65\uFF09");
  cmd.command("change <name>").description("\u67E5\u8BE2\u6307\u5B9A change \u7684\u4E0B\u4E00\u6B65").action(continueChangeHandler);
  cmd.action(continueHandler);
}
function formatContinueResult(result) {
  console.log("\u2500".repeat(50));
  console.log(`Current position: ${result.context}`);
  console.log(`Current step: ${result.currentStep}`);
  if (result.nextCommand) {
    const info = result.nextStepInfo;
    console.log("");
    console.log(`\u2192 Next step: ${result.nextCommand}`);
    if (result.slashCommand) {
      console.log(`   Slash command: ${result.slashCommand}`);
    }
    if (result.needsSubagent) {
      console.log(`   Needs sub-agent: yes`);
    }
    if (info) {
      console.log(`   Description: ${info.description}`);
      if (info.artifacts.length > 0) {
        console.log(`   Outputs:`);
        for (const a of info.artifacts) {
          console.log(`     - ${a}`);
        }
      }
    }
    if (result.instructions) {
      console.log("");
      console.log("\u2500\u2500\u2500 Instructions \u2500\u2500\u2500");
      console.log(result.instructions);
      console.log("\u2500\u2500\u2500 End Instructions \u2500\u2500\u2500");
    }
  } else {
    console.log("");
    console.log("\u2192 No available next step");
    if (result.hint) {
      console.log(`   \u{1F4A1} ${result.hint}`);
    }
  }
  console.log("\u2500".repeat(50));
}
function resolveStatusKey(type, step, projectStatus) {
  switch (type) {
    case "project":
      return projectStatus;
    case "milestone":
      return projectStatus === "milestone-shipped" ? "milestone-shipped" : "milestone-active";
    case "phase":
      return `phase-${step}`;
    case "change":
      return `change-${step}`;
    case "adhoc":
      return `adhoc-${step}`;
    default:
      return projectStatus;
  }
}
function continueHandler() {
  const specwfDir = join13(process.cwd(), "specwf");
  const cwd = process.cwd();
  const state = loadState(specwfDir);
  const validation = validateStepAdvance(state.active_context.type, state.active_context.step, state.active_context.ref, cwd);
  if (!validation.valid) {
    console.log("\u2500".repeat(50));
    console.log("\u274C \u5F53\u524D\u6B65\u9AA4\u672A\u5B8C\u6210\uFF0C\u65E0\u6CD5\u63A8\u8FDB\uFF1A");
    for (const err of validation.errors) {
      console.log(`   \u2022 ${err}`);
    }
    console.log("\u2500".repeat(50));
    return;
  }
  const result = determineNextStep(specwfDir);
  if (result.nextCommand) {
    const currentStatus = resolveStatusKey(
      state.active_context.type,
      state.active_context.step,
      state.project.status
    );
    const transition = getTransition(currentStatus, result.nextCommand);
    if (transition) {
      updateState(specwfDir, (s) => {
        s.active_context.step = transition.to;
        if (s.active_context.type === "project" || s.active_context.type === "milestone") {
          s.project.status = transition.to;
        }
      });
      console.log(`\u2713 \u72B6\u6001\u5DF2\u63A8\u8FDB: ${currentStatus} \u2192 ${transition.to}`);
    }
  }
  formatContinueResult(result);
}
function continueChangeHandler(name) {
  const specwfDir = join13(process.cwd(), "specwf");
  const result = determineChangeNextStep(specwfDir, name);
  if ("error" in result) {
    console.log("\u2500".repeat(50));
    console.log(result.error);
    console.log("\u2500".repeat(50));
    return;
  }
  if (result.nextCommand) {
    const state = loadState(specwfDir);
    const currentStatus = result.currentStep;
    const transition = getTransition(currentStatus, result.nextCommand);
    if (transition) {
      const shortStatus = transition.to.replace(/^(change|adhoc)-/, "");
      updateState(specwfDir, (s) => {
        const adhoc = s.adhoc.find((c) => c.name === name);
        if (adhoc) {
          adhoc.status = shortStatus;
          s.active_context.type = "adhoc";
          s.active_context.ref = `changes/${name}`;
          s.active_context.step = shortStatus;
          return;
        }
        const change = s.changes.find((c) => c.name === name);
        if (change) {
          change.status = shortStatus;
          s.active_context.type = "change";
          s.active_context.ref = `changes/${name}`;
          s.active_context.step = shortStatus;
          return;
        }
      });
      console.log(`\u2713 \u72B6\u6001\u5DF2\u63A8\u8FDB: ${currentStatus} \u2192 ${transition.to}`);
    }
  }
  formatContinueResult(result);
}

// src/commands/specwf-archive.ts
import { join as join15 } from "path";
import { existsSync as existsSync10, readdirSync as readdirSync6, mkdirSync as mkdirSync5, copyFileSync } from "fs";
import { execSync as execSync2 } from "child_process";

// src/core/delta-merge.ts
import { createHash } from "crypto";
import { readFileSync as readFileSync8, writeFileSync as writeFileSync6, existsSync as existsSync8 } from "fs";

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
  const baseSpec = readFileSync8(liveSpecPath, "utf-8");
  const deltaSpec = readFileSync8(deltaSpecPath, "utf-8");
  const result = mergeDeltaSpec(baseSpec, deltaSpec, baseFingerprint);
  if (result.type === "ok") {
    writeFileSync6(liveSpecPath, result.merged, "utf-8");
  }
  return result;
}

// src/core/code-extract.ts
import { execSync } from "child_process";
import { existsSync as existsSync9, readFileSync as readFileSync9, writeFileSync as writeFileSync7, mkdirSync as mkdirSync4, readdirSync as readdirSync5 } from "fs";
import { join as join14 } from "path";
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
  const specsDir = join14(changeDir, "specs");
  if (!existsSync9(specsDir)) return ["general"];
  try {
    return readdirSync5(specsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
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
  const domainDir = join14(specsDir, extraction.domain);
  const specPath = join14(domainDir, "spec.md");
  let existing = "";
  if (existsSync9(specPath)) {
    existing = readFileSync9(specPath, "utf-8");
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
  const specwfDir = join15(process.cwd(), "specwf");
  const fullChangePath = join15(process.cwd(), changePath);
  if (!existsSync10(fullChangePath)) {
    console.error(`\u9519\u8BEF: change \u76EE\u5F55\u4E0D\u5B58\u5728: ${changePath}`);
    process.exit(1);
  }
  const specsDir = join15(fullChangePath, "specs");
  if (existsSync10(specsDir)) {
    mergeDeltaSpecs(specsDir, specwfDir);
    console.log("\u2713 delta-specs \u5408\u5E76\u5B8C\u6210");
  }
  const summaryPath = join15(fullChangePath, "change-summary.md");
  if (!existsSync10(summaryPath)) {
    console.warn("\u26A0 change-summary.md \u4E0D\u5B58\u5728\u3002\u5EFA\u8BAE\u5148\u4F7F\u7528 `specwf template change-summary` \u751F\u6210\u53D8\u66F4\u603B\u7ED3\u3002");
  }
  const repoDir = process.cwd();
  const extractResult = extractFromGitDiff(repoDir, fullChangePath);
  if (extractResult.available && extractResult.extractions.length > 0) {
    for (const extraction of extractResult.extractions) {
      writeExtractionToSpec(join15(specwfDir, "specs"), extraction);
    }
    if (extractResult.extractions.length > 0) {
      console.log(`\u2713 \u4EE3\u7801\u8BA4\u77E5\u63D0\u53D6\u5B8C\u6210 (${extractResult.extractions.length} \u4E2A\u57DF)`);
    }
  }
  const archiveDir = archiveChangeDir(specwfDir, fullChangePath);
  console.log(`\u2713 \u5F52\u6863\u5230: ${archiveDir}`);
  try {
    execSync2(`git rm -r "${changePath}" 2>/dev/null || true`, { cwd: process.cwd() });
  } catch {
  }
  const changeName = changePath.split("/").pop() ?? "unknown";
  try {
    updateState(specwfDir, (state) => {
      const change = state.changes.find((c) => c.name === changeName);
      if (change) {
        change.status = "archived";
        return;
      }
      const adhoc = state.adhoc.find((c) => c.name === changeName);
      if (adhoc) {
        adhoc.status = "archived";
      }
    });
    console.log("\u2713 state.md \u5DF2\u66F4\u65B0");
  } catch {
  }
  console.log("\u5F52\u6863\u5B8C\u6210\u3002");
}
function mergeDeltaSpecs(deltaDir, specwfDir) {
  const entries = readdirSync6(deltaDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const deltaSpecPath = join15(deltaDir, entry.name, "spec.md");
    const liveSpecPath = join15(specwfDir, "specs", entry.name, "spec.md");
    if (!existsSync10(deltaSpecPath)) continue;
    if (!existsSync10(liveSpecPath)) {
      mkdirSync5(join15(specwfDir, "specs", entry.name), { recursive: true });
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
import { join as join16 } from "path";
function register8(program2) {
  program2.command("list").description("\u5217\u51FA milestones/phases/changes").option("--all", "\u5305\u542B\u5F52\u6863").action(listHandler);
}
function listHandler(options) {
  const specwfDir = join16(process.cwd(), "specwf");
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
import { join as join17 } from "path";
import { mkdirSync as mkdirSync6, writeFileSync as writeFileSync8 } from "fs";

// src/templates/artifacts/index.ts
var PROPOSAL_TEMPLATE = `# Proposal: {{name}}

> This document is a Change Proposal \u2014 align intent, scope, and approach before implementation. Complete each section; reviewers will evaluate this proposal before the design phase.

---

## Intent

<!--
Describe why this change is needed:
1. What specific problem exists or what capability is missing?
2. Who is affected (users/developers/ops)? How severely?
3. What happens if we don't make this change?
4. Is this a bug fix / feature / tech debt / perf improvement?
5. Is this linked to a known issue, user feedback, or metric? (attach issue link if available)
-->

{{intent}}

---

## Scope

### In scope

<!--
List all items covered by this change. One per line, verb-first.
Example:
- Add skeleton loading state on list pull-to-refresh
- Add useScrollPerformance hook for scroll metrics
- Memoize UserCard component
-->

{{in-scope-items}}

### Out of scope

<!--
Explicitly excluded changes to prevent scope creep. One per line with reason.
Example:
- Homepage skeleton screen (planned for next phase)
- Server-side API pagination (unrelated to client performance)
- Android list optimization (platform-specific, needs separate research)
-->

{{out-of-scope-items}}

---

## Approach

<!--
Describe the technical direction at a high level:
1. Architecture layer: Which layer does the change touch (UI/Service/Store)? New modules needed?
2. Library choices: New dependencies? Upgrades? Rationale?
3. Data flow: How does data travel from source to UI? State management changes?
4. Compatibility: Backward compatibility strategy? Migration needed?
5. Testability: Are there injection points / mock seams for testing?

No detailed implementation here \u2014 the design doc handles that.
-->

{{approach}}

---

## Must-haves

<!--
3-7 observable, verifiable must-have behaviors.
Each must be a concrete statement \u2014 no ambiguity.
Reviewers should be able to judge pass/fail using these conditions.

Format: "MUST <condition>" or "SHALL <condition>"
- Observable: visible on screen, checkable via CLI, assertable in tests
- Verifiable: reviewer can confirm via action/command
-->

{{must-haves}}

---

## Non-goals

<!--
Explicit non-goals to prevent reviewers from asking "why wasn't X done?"
Different from Out of scope (not in this change's scope).
Non-goals are specific targets that might be incorrectly assumed to be in scope.
Example:
- Not pursuing Android list performance in this change
- Not changing the existing pagination logic
- Not adding new UI component library dependencies
-->

{{non-goals}}
`;
var DESIGN_TEMPLATE = `# Design: {{name}}

> This document is the Change Design \u2014 written after proposal approval, describing how to implement. Each section has fill-in guidance. After this document, proceed to task breakdown.

---

## Context & Goals

<!--
1. Briefly describe context \u2014 what constraints exist?
2. Core design goals (no more than 3)
3. Must align with proposal Intent and Must-haves
-->

{{background-and-goals}}

---

## Technical Approach

### Architecture Diagram

<!--
ASCII art showing module/component relationships:
- New modules vs. existing modules
- Data flow direction (arrows)
- File/module boundaries
Annotate: [NEW], [MODIFIED], [EXISTING]
-->

\`\`\`text
{{architecture-diagram}}
\`\`\`

### Core Data Structures

<!--
Key types/interfaces/data structures introduced or modified by this design.
Use TypeScript interface format. Brief description per type.
-->

{{data-structures}}

### Data Flow

<!--
Step-by-step description of data flow from trigger to effect.
Example:
1. User scrolls list \u2192 FlatList fires onScroll
2. OptimizedList reads itemHeight config \u2192 enables getItemLayout
3. Layout engine skips dynamic measurement \u2192 uses fixed row height
4. useScrollPerformance samples FPS every 500ms
5. FPS data \u2192 Performance Reporter \u2192 backend
-->

{{data-flow}}

### Interface Design

<!--
Public API signatures exposed by this design:
- Function/method names
- Parameter lists (name + type + description)
- Return types
- sync/async
-->

{{api-signatures}}

---

## File Manifest

<!--
All files to create or modify, organized as a table.
-->

| File Path | Description | Action |
|-----------|-------------|--------|
| \`{{file-path-1}}\` | {{description}} | Create |
| \`{{file-path-2}}\` | {{description}} | Modify |

---

## Test Strategy

### Unit Tests
- <!-- Which modules need unit tests? What needs mocking? -->

### Integration Tests
- <!-- Which flows need integration tests? What fixtures needed? -->

### TDD Tasks
- <!-- List type:behavior tasks requiring RED\u2192GREEN\u2192REFACTOR -->

---

## Alternatives

<!--
Evaluated but rejected approaches, with rationale.
-->

| Approach | Pros | Cons | Rejection Reason |
|----------|------|------|-----------------|
| {{alt-name-1}} | {{pros}} | {{cons}} | {{reason}} |
| {{alt-name-2}} | {{pros}} | {{cons}} | {{reason}} |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| {{risk-1}} | {{probability}} | {{impact}} | {{mitigation}} |
| {{risk-2}} | {{probability}} | {{impact}} | {{mitigation}} |
`;
var TASKS_TEMPLATE = `# Tasks: {{name}}

> This document breaks the design into executable tasks grouped by wave. Each task includes description, files, acceptance criteria, optional depends_on and spec_ref. type:behavior tasks must include RED test descriptions (GIVEN/WHEN/THEN format).

---

## TDD Type Annotations

| type | Meaning | TDD Protocol |
|------|---------|-------------|
| \`behavior\` | Business behavior \u2014 implement a concrete, observable/assertable feature | **RED\u2192GREEN\u2192REFACTOR** (mandatory: test first \u2192 implement \u2192 refactor) |
| \`config\` | Configuration \u2014 env vars, CI/CD, lint, tsconfig, etc. | Direct implementation, no TDD |
| \`refactor\` | Refactoring \u2014 improve internal structure without changing behavior | Verify tests pass \u2192 refactor \u2192 verify again |
| \`docs\` | Documentation \u2014 README, API docs, comments | Direct implementation, no TDD |
| \`scaffolding\` | Skeleton code \u2014 new module shells, directory structure, templates | Direct implementation, no TDD |

> **Rule**: If a task's core output is "a behavior" (user-perceptible or test-assertable), use \`behavior\`. If it's just "file exists" or "config takes effect", use \`config\`/\`scaffolding\`.

---

## Wave 1: {{wave-1-theme}}

<!--
A wave is an independently verifiable unit of work. Tasks within a wave may have dependencies but the wave is self-contained.
Each wave completion enables verification (tsc + test pass).
-->

- [ ] task-{{id-1}}: [type:{{type}}] {{title}}
  - **description**: {{What to do, approach, files/APIs to reference}}
  - **files**: {{comma-separated file paths}}
  - **acceptance**: {{observable, assertable acceptance criteria}}
  - **depends_on**: [task-{{id-x}}] <!-- optional: predecessor -->
  - **spec_ref**: specs/{{domain}}/spec.md <!-- optional: linked spec -->
  {{if behavior}}
  - ***RED test***:
    \`\`\`
    GIVEN {{precondition}}
    WHEN {{trigger action}}
    THEN {{expected result}}
    \`\`\`
  {{/if}}

---

## Wave 2: {{wave-2-theme}}

- [ ] task-{{id-3}}: [type:{{type}}] {{title}}
  - **description**: {{What to do}}
  - **files**: {{file paths}}
  - **acceptance**: {{acceptance criteria}}
  - **depends_on**: [task-{{id-1}}] <!-- optional -->
  {{if behavior}}
  - ***RED test***:
    \`\`\`
    GIVEN {{precondition}}
    WHEN {{trigger action}}
    THEN {{expected result}}
    \`\`\`
  {{/if}}

---

## Verification

- [ ] \`tsc --noEmit\` passes (or equivalent type check)
- [ ] \`vitest run\` all test suites pass
- [ ] Each wave's acceptance criteria confirmed (manual or automated)
- [ ] New code passes lint check
- [ ] No new type errors or warnings introduced
`;
var CONTEXT_TEMPLATE = `# Context: {{name}}

> Phase implementation decisions document. Captures architecture decisions, interface contracts, and implementation constraints for this phase. Written during the discuss phase.

---

## Phase Goals
<!-- What does this phase deliver? -->

{{phase-goals}}

---

## Architecture Decisions

<!-- Numbered decisions: D1, D2, ... Each decision records what was chosen and why. -->

### D1: {{decision-title}}
- **Decision**: {{what we decided}}
- **Rationale**: {{why}}
- **Alternatives considered**: {{what else we evaluated}}

### D2: {{decision-title}}
- **Decision**: {{what we decided}}
- **Rationale**: {{why}}
- **Alternatives considered**: {{what else we evaluated}}

---

## Interface Contracts

<!-- Key APIs and data models for this phase. -->

{{interface-contracts}}

---

## Implementation Constraints

<!-- Technical limits and boundaries for this phase. -->

{{constraints}}

---

## Change Split Plan

<!-- Preliminary breakdown of this phase into changes. -->

{{change-split-plan}}

---

## Non-Goals

<!-- Explicitly excluded from this phase. -->

{{non-goals}}
`;
var RESEARCH_TEMPLATE = `# Research: {{name}}

> Technical research document. Compares alternatives, assesses feasibility, and produces recommendations.

---

## Research Scope

{{scope}}

---

## Candidate Comparison

| Criterion | Option A: {{name-a}} | Option B: {{name-b}} | Option C: {{name-c}} |
|-----------|---------------------|---------------------|---------------------|
| {{criterion-1}} | {{score}} | {{score}} | {{score}} |
| {{criterion-2}} | {{score}} | {{score}} | {{score}} |

---

## Recommendation

**Recommended**: {{recommended-option}}

**Rationale**: {{rationale}}

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| {{risk-1}} | {{likelihood}} | {{impact}} | {{mitigation}} |

---

## Open Questions

- {{question-1}}
- {{question-2}}
`;
var SUMMARY_TEMPLATE = `# Summary: {{name}}

> Change completion summary. Generated after all waves are complete.

---

## Intent Recap
{{intent}}

## Files Changed
| File | Action | Lines |
|------|--------|-------|
| {{file-1}} | {{action}} | {{lines}} |

## Key Decisions
- {{decision-1}}
- {{decision-2}}

## Verification
- [ ] All tests pass
- [ ] Type check passes
- [ ] Delta-specs covered
`;
var VERIFICATION_TEMPLATE = `# Verification: {{name}}

> Goal-backward verification report. Confirms the change delivers what it promised.

---

## Status: {{status}}

<!-- passed | gaps_found | human_needed -->

## Delta-Spec Coverage

| Spec Item | Test Coverage | Status |
|-----------|--------------|--------|
| {{spec-item-1}} | {{test}} | {{status}} |

## TDD Commit Integrity

| Task | RED | GREEN | REFACTOR | Status |
|------|-----|-------|----------|--------|
| {{task-1}} | {{commit}} | {{commit}} | {{commit}} | {{status}} |

## Test Suite

- Total: {{total}}
- Passed: {{passed}}
- Failed: {{failed}}
- Skipped: {{skipped}}

## Findings

{{findings}}
`;
var SPEC_REVIEW_TEMPLATE = `# Spec Review: {{name}}

> Specification compliance review. Cross-references delta-spec SHALL/MUST constraints against implementation.

---

## Overall: {{verdict}}

<!-- PASS / FAIL / NEEDS_REVISION -->

## Constraint Checklist

| # | Constraint | Location | Status | Evidence |
|---|-----------|----------|--------|----------|
| 1 | {{constraint}} | {{file:line}} | PASS / FAIL / N/A | {{note}} |

## Edge Case Coverage

| Edge Case | Covered? | Evidence |
|-----------|---------|----------|
| {{edge-case}} | {{yes/no}} | {{note}} |

## Findings

{{findings}}
`;
var QUALITY_REVIEW_TEMPLATE = `# Quality Review: {{name}}

> Code quality audit. Checks for bugs, security issues, conventions, and common AI mistakes.

---

## Overall: {{verdict}}

<!-- PASS / FAIL / NEEDS_REVISION -->

## Issues

| # | Severity | Category | Location | Description |
|---|----------|----------|----------|-------------|
| 1 | BLOCKER / MAJOR / MINOR / INFO | {{category}} | {{file:line}} | {{description}} |

## Convention Compliance

| Rule | Status | Note |
|------|--------|------|
| {{rule}} | {{status}} | {{note}} |

## Findings

{{findings}}
`;
var GOAL_REVIEW_TEMPLATE = `# Goal Review: {{name}}

> Goal achievement review. Cross-references proposal.md goals and must_haves against implementation.

---

## Overall: {{verdict}}

<!-- PASS / FAIL / NEEDS_REVISION -->

## Goal Checklist

| # | Goal / Must-have | Status | Evidence |
|---|-----------------|--------|----------|
| 1 | {{goal}} | ACHIEVED / PARTIAL / NOT_ACHIEVED | {{note}} |

## Completeness Assessment

{{assessment}}

## Findings

{{findings}}
`;
var CHANGE_SUMMARY_TEMPLATE = `# Change Summary: {{name}}

> Auto-generated summary after all waves complete.

---

## Intent
{{intent}}

## Output Files
| File | Action |
|------|--------|
| {{file}} | {{action}} |

## Key Decisions
- {{decision}}

## Verification Results
- Type check: {{typecheck}}
- Tests: {{tests}}
- Lint: {{lint}}
`;
var ARTIFACT_TEMPLATES = {
  proposal: PROPOSAL_TEMPLATE,
  design: DESIGN_TEMPLATE,
  tasks: TASKS_TEMPLATE,
  context: CONTEXT_TEMPLATE,
  research: RESEARCH_TEMPLATE,
  summary: SUMMARY_TEMPLATE,
  verification: VERIFICATION_TEMPLATE,
  "spec-review": SPEC_REVIEW_TEMPLATE,
  "quality-review": QUALITY_REVIEW_TEMPLATE,
  "goal-review": GOAL_REVIEW_TEMPLATE,
  "change-summary": CHANGE_SUMMARY_TEMPLATE
};
var TEMPLATE_IDS = Object.keys(ARTIFACT_TEMPLATES);

// src/commands/specwf-template.ts
function register9(program2) {
  program2.command("template <type>").description(`Generate template file (${TEMPLATE_IDS.join("|")})`).option("--name <name>", "change name", "my-change").option("--dir <path>", "target directory (default specwf/changes/<name>/)").action(templateHandler);
}
function templateHandler(type, options) {
  const template = ARTIFACT_TEMPLATES[type];
  if (!template) {
    console.error(`Unknown template type: ${type}. Available: ${TEMPLATE_IDS.join(", ")}`);
    process.exit(1);
  }
  let content = template;
  const name = options.name;
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  content = content.replace(/\{\{name\}\}/g, name);
  content = content.replace(/\{\{date\}\}/g, date);
  const filenames = {
    proposal: "proposal.md",
    design: "design.md",
    tasks: "tasks.md",
    context: "context.md",
    research: "research.md",
    summary: "summary.md",
    verification: "verification.md",
    "spec-review": "spec-review.md",
    "quality-review": "quality-review.md",
    "goal-review": "goal-review.md",
    "change-summary": "change-summary.md"
  };
  const filename = filenames[type] ?? `${type}.md`;
  let targetDir;
  if (options.dir) {
    targetDir = options.dir.startsWith("/") ? options.dir : join17(process.cwd(), options.dir);
  } else {
    targetDir = join17(process.cwd(), "specwf", "changes", name);
  }
  mkdirSync6(targetDir, { recursive: true });
  const fullPath = join17(targetDir, filename);
  writeFileSync8(fullPath, content, "utf-8");
  console.log(`\u2713 Created ${fullPath}`);
}

// src/commands/specwf-change.ts
import { join as join18 } from "path";
import { writeFileSync as writeFileSync9 } from "fs";
function register10(program2) {
  const cmd = program2.command("change").description("Manage changes (create/list)");
  cmd.command("new <name>").description("Create adhoc change (independent of milestone/phase)").option("--dir <path>", "specwf directory", "specwf").action(newChange);
  cmd.action(() => {
    console.log("Usage: specwf change new <name>");
  });
}
function newChange(name, options) {
  const specwfDir = join18(process.cwd(), options.dir);
  const changeDir = createAdhocChangeDir(specwfDir, name);
  console.log(`\u2713 Created change directory: changes/${name}/`);
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const templateMap = {
    "proposal.md": ARTIFACT_TEMPLATES["proposal"],
    "design.md": ARTIFACT_TEMPLATES["design"],
    "tasks.md": ARTIFACT_TEMPLATES["tasks"]
  };
  for (const [file, template] of Object.entries(templateMap)) {
    const content = (template ?? `# ${file.replace(".md", "")}: ${name}
`).replace(/\{\{name\}\}/g, name).replace(/\{\{date\}\}/g, date);
    writeFileSync9(join18(changeDir, file), content, "utf-8");
  }
  console.log("\u2713 Created template files: proposal.md, design.md, tasks.md");
  try {
    updateState(specwfDir, (state) => {
      state.adhoc.push({ name, status: "proposal", depends_on: [] });
    });
    console.log("\u2713 state.md updated");
  } catch {
    console.log("\u26A0 state.md update failed (non-critical)");
  }
  console.log("");
  console.log("\u2192 Next: complete the proposal, then run specwf continue to advance");
}

// src/cli.ts
var __dirname2 = dirname2(fileURLToPath2(import.meta.url));
var pkg = JSON.parse(readFileSync11(join19(__dirname2, "..", "package.json"), "utf-8"));
var version = pkg.version;
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
program.parse(process.argv);
