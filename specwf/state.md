---
project:
  name: specwf
  status: milestone-shipped
  current_milestone: m1-core
  current_phase: null
active_context:
  type: milestone
  ref: milestones/m1-core
  step: shipped
changes:
  - name: scaffold-project
    status: archived
    depends_on: []
  - name: define-types
    status: archived
    depends_on:
      - scaffold-project
  - name: implement-parsers
    status: archived
    depends_on:
      - define-types
  - name: config-state
    status: archived
    depends_on:
      - implement-parsers
  - name: core-engines
    status: archived
    depends_on:
      - config-state
  - name: implement-command-generator
    status: archived
    depends_on:
      - core-engines
  - name: implement-agent-generator
    status: archived
    depends_on:
      - implement-command-generator
  - name: implement-skill-generator
    status: archived
    depends_on:
      - implement-agent-generator
  - name: implement-init
    status: archived
    depends_on:
      - implement-skill-generator
  - name: implement-update
    status: archived
    depends_on:
      - implement-init
  - name: implement-context-continue
    status: archived
    depends_on: []
  - name: implement-archive
    status: archived
    depends_on: []
  - name: implement-list-template
    status: archived
    depends_on: []
  - name: fix-generator-architecture
    status: archived
    depends_on: []
  - name: integration-tests
    status: archived
    depends_on: []
  - name: brownfield-init
    status: archived
    depends_on: []
  - name: npm-publish-config
    status: archived
    depends_on: []
adhoc:
  - name: bootstrap-specwf
    status: archived
    depends_on: []
---
# State

## 当前位置

Phase ? — shipped。

## 状态机

项目层路径: `initialized → requirements-defined → researched → roadmap-defined`

## 历史
