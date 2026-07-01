# Tasks: fix-command-params

> **填表指引**：本文档将 design 拆解为按 wave 分组的可执行 task。每个 task 需包含 description、files、acceptance、可选的 depends_on 和 spec_ref。type:behavior 的 task 必须编写 RED 测试描述（GIVEN/WHEN/THEN 格式）。

---

## TDD type 标注规则

<!--
每种 task 的 type 定义其 TDD 协议。
type:behavior 必须走 RED→GREEN→REFACTOR，其余 type 直接实现。
-->

| type | 含义 | TDD 协议 |
|---|---|---|
| `behavior` | 业务行为——实现一个具体的、可观测/可断言的业务功能 | **RED→GREEN→REFACTOR**（强制 TDD：先写测试 → 实现 → 重构） |
| `config` | 配置文件——环境变量、CI/CD、lint、tsconfig 等 | 直接实现，无需 TDD |
| `refactor` | 重构——不改变外部行为只改善内部结构 | 先验证已有测试通过 → 重构 → 再次验证 |
| `docs` | 文档——README、API 文档、注释 | 直接实现，无需 TDD |
| `scaffolding` | 骨架代码——新建模块的空壳、目录结构、模板文件 | 直接实现，无需 TDD |

> **规则**：如果 task 的核心产出是"某个行为"（用户可感知或测试可断言），使用 `behavior`。如果只是"文件存在"或"配置生效"，使用 `config`/`scaffolding`。

---

## Wave 1: {{wave-1-theme}}

<!--
Wave 是独立可验证的工作单元。一个 wave 内的 task 可能有依赖关系但整体封闭。
每个 wave 完成后可执行验证（tsc + test pass）。
-->

- [ ] task-{{id-1}}: [type:{{type}}] {{title}}
  - **description**: {{详细描述：具体做什么、用什么方法、参考哪些文件/API}}
  - **files**: {{文件路径列表，逗号分隔}}
  - **acceptance**: {{可观测可断言的验收标准}}
  - **depends_on**: [task-{{id-x}}] <!-- 可选：前置依赖 -->
  - **spec_ref**: specs/{{domain}}/spec.md <!-- 可选：关联的规格文件 -->
  {{if behavior}}
  - ***RED 测试***:
    ```
    GIVEN {{前置条件}}
    WHEN {{操作触发}}
    THEN {{预期结果}}
    ```
  {{/if}}

- [ ] task-{{id-2}}: [type:{{type}}] {{title}}
  - **description**: {{详细描述}}
  - **files**: {{文件路径列表}}
  - **acceptance**: {{验收标准}}
  {{if behavior}}
  - ***RED 测试***:
    ```
    GIVEN {{前置条件}}
    WHEN {{操作触发}}
    THEN {{预期结果}}
    ```
  {{/if}}

---

## Wave 2: {{wave-2-theme}}

<!--
如果设计超过一个 wave，在此添加。Wave 2 依赖 Wave 1 的产出。
-->

- [ ] task-{{id-3}}: [type:{{type}}] {{title}}
  - **description**: {{详细描述}}
  - **files**: {{文件路径列表}}
  - **acceptance**: {{验收标准}}
  - **depends_on**: [task-{{id-1}}] <!-- 可选 -->
  {{if behavior}}
  - ***RED 测试***:
    ```
    GIVEN {{前置条件}}
    WHEN {{操作触发}}
    THEN {{预期结果}}
    ```
  {{/if}}

- [ ] task-{{id-4}}: [type:{{type}}] {{title}}
  - **description**: {{详细描述}}
  - **files**: {{文件路径列表}}
  - **acceptance**: {{验收标准}}
  {{if behavior}}
  - ***RED 测试***:
    ```
    GIVEN {{前置条件}}
    WHEN {{操作触发}}
    THEN {{预期结果}}
    ```
  {{/if}}

---

## 验证

<!--
填写指引：
所有 task 实现完毕后，在此 checklist 中逐项确认。
-->

- [ ] `tsc --noEmit` 通过（或对应语言的类型检查）
- [ ] `vitest run` 测试套件全部通过
- [ ] 每个 wave 的验收标准已通过人工或自动化确认
- [ ] 新增代码的 lint 检查通过
- [ ] 未引入新的类型错误或告警
