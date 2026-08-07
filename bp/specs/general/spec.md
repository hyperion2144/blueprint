## Auto-Extracted Behaviors
### Detected Behaviors
- 新增: function archiveMilestoneDir(blueprintDir, milestoneId) {
- 新增: function register(program2) {
- 新增: async function initHandler(options) {
- 新增: function isTemplateFile(filePath) {
- 新增: function findChangeDir(blueprintDir) {
- 新增: function checkExitCondition(blueprintDir, check) {
- 新增: function validateStepAdvance(contextType, contextStep, cwd) {
- 新增: function determineChangeNextStep(blueprintDir, changeName) {
- 新增: function getStepInfo(command) {
- 新增: function determineFromChangeStatus(name, statusKey, type) {
- 新增: function listAvailableChanges(state) {
- 新增: function formatContinueResult(result) {
- 新增: function continueHandler() {
- 新增: function continueChangeHandler(name) {

### Detected Constraints
- 约束: if (!existsSync2(sourceDir)) {
- 约束: if (pkg2.dependencies?.next) info.framework = "next.js";
- 约束: if (isInitialized(blueprintDir)) {
- 约束: if (isBrownfield) {
- 约束: if (!existsSync6(changesDir)) return [];
- 约束: if (check.path.endsWith("/") || check.description.includes("\u7684 ")) {
- 约束: if (existsSync6(docPath) && isTemplateFile(docPath)) {
- 约束: if (!existsSync6(fullPath)) {
- 约束: if (isTemplateFile(fullPath)) {
- 约束: if (!criteria) {
- 约束: if (error) {
- 约束: if (prevMilestone && prevMilestone !== id && currentState.project.status !== "milestone-shipped") {
- 约束: if (!result.valid) {
- 约束: if (existsSync7(join13(blueprintDir, "requirements.md"))) {
- 约束: if (!existsSync7(convDir)) return [];
- 约束: if (!existsSync7(changeDir)) return [];
- 约束: if (existsSync7(fullPath)) {
- 约束: if (existsSync7(specsDir)) {
- 约束: if (!existsSync7(dir)) return [];
- 约束: if (change) {
- 约束: if (adhoc) {
- 约束: if (pendingAdhoc.length > 0) {
- 约束: if (info) {
- 约束: if (info.artifacts.length > 0) {
- 约束: if (info.fileRef) {
- 约束: if ("error" in result) {
- 约束: if (!existsSync9(specsDir)) return ["general"];
- 约束: if (existsSync9(specPath)) {
- 约束: if (!existsSync10(fullChangePath)) {
- 约束: if (existsSync10(specsDir)) {
- 约束: if (!existsSync10(summaryPath)) {
- 约束: if (adhoc) {
- 约束: if (!existsSync10(deltaSpecPath)) continue;
- 约束: if (!existsSync10(liveSpecPath)) {
- 约束: if (!templateFile) {
- 约束: if (!existsSync11(templatePath)) {
- 约束: if (existsSync12(tplPath)) {

<!-- END AUTO-EXTRACTED -->

<!-- AUTO-EXTRACTED: 以下内容由 code-extract 从代码 diff 提取，请人工审核 -->


## Auto-Extracted Behaviors
### Detected Behaviors
- 新增: export function generateAll(config: ProjectConfig): GeneratedFile[]

<!-- END AUTO-EXTRACTED -->


## Requirements
### Requirement: Refactorer-Behavior-Preservation
The `bp dispatch refactorer` subcommand SHALL reuse the executor-style isolation machinery for the configured platform and SHALL constrain each refactorer dispatch to a single module path passed via `--target <module>`. A refactorer run that alters observable behavior — measured by `npm test` exiting non-zero — MUST revert the move and report the failure. Spec edits MUST be limited to `bp/specs/<domain>/spec.md` files whose contents reference the changed file paths or exports; unrelated domains MUST NOT be modified.
#### Scenario: per-module dispatch with executor isolation
- **GIVEN** a project configured with `platform: [omp, claude-code, agent, codex]`
- **WHEN** `bp dispatch refactorer --target src/core` runs
- **THEN** stdout contains an `### Isolation` section
- **AND** the section reports the same isolation type as `bp dispatch executor --target src/core` for each platform
- **AND** the dispatch instructs the orchestrator to invoke a sub-agent for the `refactorer` role only (not planner, executor, or reviewer).

#### Scenario: refactorer dispatch rejects unscoped targets
- **GIVEN** an initialized bp project
- **WHEN** `bp dispatch refactorer` runs without `--target`
- **THEN** stderr contains a usage message referencing `--target`
- **AND** the command exits with code `1`.

#### Scenario: spec sync stays inside affected domains
- **GIVEN** a refactorer dispatch assigned to module `src/core/refactor-analyzer.ts`
- **WHEN** the refactorer reports its diff summary at the end of the run
- **THEN** the summary lists every modified `bp/specs/<domain>/spec.md` file
- **AND** every listed domain corresponds to a directory whose contracts reference the changed module path or its exports.


