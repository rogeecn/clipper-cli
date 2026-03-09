# Workspace Root Cleanup Design

## Goal

在仓库已经迁移到 workspace 结构之后，清理根目录仍残留的旧单包时代目录和配置，避免出现“双份源码、双份构建输出、双份配置”的误导状态。

## Current State

当前仓库已经具备新的 workspace 结构：

- `packages/clipper-cli`
- `packages/clipper-plugin-weixin`
- 根目录 `package.json` 已转为 workspace root
- `pnpm-workspace.yaml` 和 `pnpm-lock.yaml` 已生效

但根目录仍保留了旧单包时代的残留：

- `src/`
- `dist/`
- `examples/`
- 根级 `tsconfig.json`
- 根级 `vitest.config.ts`
- `package-lock.json`
- `.npmignore`

这些文件和目录已经不是新的源码或发布来源，却仍然会造成以下问题：

- 让维护者误以为根目录仍然是 `clipper-cli` 的真实包根
- 增加测试、构建和 import 路径混淆
- 容易让后续修改落在错误位置
- 让仓库同时呈现“单包”和“workspace”两套结构，长期不可维护

## Cleanup Principle

清理的核心原则是：

- **源码只保留一份**：`clipper-cli` 只保留在 `packages/clipper-cli`，`clipper-plugin-weixin` 只保留在 `packages/clipper-plugin-weixin`
- **构建产物只保留在对应包内**：根目录不再保留旧 `dist/`
- **配置只保留真实入口**：根目录只保留 workspace 协调配置；包自己的构建/测试配置只放在各自包目录中

## Keep vs Remove

### Keep at Repository Root

保留以下根目录文件/目录：

- `package.json`（workspace root）
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `packages/`
- `tests/`
- `docs/`
- `.gitignore`
- 其他 Git/项目级元文件（如 `.git`, `.github` 若存在）

### Remove from Repository Root

删除以下旧单包残留：

- `src/`
- `dist/`
- `examples/`
- `tsconfig.json`
- `vitest.config.ts`
- `package-lock.json`
- `.npmignore`

## Test Impact

根目录旧结构删除后，需要确认两类测试仍然成立：

### 1. Root-level workspace tests

根测试必须只依赖：

- workspace root 配置
- `packages/*` 中的真实包
- `tests/fixtures/*`

不应再依赖：

- 根目录 `src/`
- 根目录 `dist/`
- 根目录 `vitest.config.ts`

### 2. Package-local tests

`packages/clipper-cli/tests` 和 `packages/clipper-plugin-weixin/tests` 应保持独立可运行，不受根目录旧结构删除影响。

## Cleanup Strategy

建议按两步执行：

### Phase 1: Lock behavior with tests

先增加或调整根级回归测试，明确以下约束：

- 根目录不再包含单包源码入口
- 根目录测试与 workspace 流程不依赖旧 `src/` / `dist/`
- 包内测试和构建仍能独立通过

### Phase 2: Remove legacy root structure

再真正删除旧目录和配置，并修复所有仍引用旧根路径的测试或脚本。

## Alternatives Considered

### A. Keep old root files “for transition”

不采用。

虽然短期看似保守，但实际上会让仓库长期停留在模糊状态，后续每次改动都要判断“该改根目录还是 `packages/clipper-cli`”，成本更高。

### B. Delete only `dist/`

不采用。

这只能清掉构建产物，无法解决双份源码和双份配置的结构性问题。

### C. Delete old source directories but keep root configs

不采用。

如果根级 `tsconfig.json`、`vitest.config.ts` 等仍保留，就仍会暗示根目录具有包级构建/测试职责，不符合新的 workspace 边界。

## Recommendation

采用彻底清理方案：

- 删除根目录旧单包源码、产物和配置
- 保留根目录仅作为 workspace 协调层
- 所有真实包逻辑收敛到 `packages/*`

这是最符合当前架构、也最不容易再次长出“第二套入口”的做法。

## Success Criteria

满足以下条件即视为清理成功：

- 根目录不再存在旧单包残留的 `src/`、`dist/`、`examples/`
- 根目录不再保留旧单包专用配置文件
- `clipper-cli` 和 `clipper-plugin-weixin` 的源码与配置只存在于 `packages/*`
- 根测试、包测试和 workspace 构建测试继续通过
- 新维护者进入仓库后，不会误判真实源码入口位置
