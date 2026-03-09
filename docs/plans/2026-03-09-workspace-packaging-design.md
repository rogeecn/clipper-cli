# Workspace Packaging Design

## Goal

将当前单包仓库调整为一个 workspace/monorepo 结构，使 `clipper-cli` 和 `clipper-plugin-weixin` 在同一个仓库中开发、测试和联调，但仍然作为两个独立的 NPM 包分别发布。

## Current State

当前仓库根目录本身就是 `clipper-cli` 包，源码、测试、构建配置和文档都直接放在仓库根层级。

现有的微信插件逻辑已经以“外部插件”的方式被验证，但它仍然只是测试 fixture：

- `tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin/...`

这证明了插件接口和自动发现链路可行，但并不适合作为正式源码位置或发布来源。

## Proposed Structure

采用 workspace 根 + `packages/*` 子包的结构：

- `package.json`：workspace 根配置，不再直接作为 `clipper-cli` 发布包
- `pnpm-workspace.yaml`：声明 workspace 范围
- `packages/clipper-cli`：宿主 CLI 包
- `packages/clipper-plugin-weixin`：微信插件包
- `tests/fixtures/...`：保留为测试场景，但只承担 fixture/安装镜像角色，不再保存插件正式源码

目录示意：

```text
.
├── package.json
├── pnpm-workspace.yaml
├── packages/
│   ├── clipper-cli/
│   │   ├── package.json
│   │   ├── src/
│   │   ├── tests/ (可选，若保留共用 tests 也可不放)
│   │   └── README.md
│   └── clipper-plugin-weixin/
│       ├── package.json
│       ├── src/
│       ├── README.md
│       └── tsconfig.json
└── tests/
```

## Package Boundaries

### 1. `clipper-cli`

继续作为宿主包，负责：

- CLI 入口
- runtime config / plugin discovery
- request / playwright / publish pipeline
- 内置默认插件
- 对外导出插件类型和公共 API

### 2. `clipper-plugin-weixin`

作为独立发布包，负责：

- `weixin` collector
- `weixin` transformer
- 微信 DOM 清洗与 Markdown 转换逻辑
- 插件自身的 README、版本和发布配置

它不直接复制宿主内部实现，只依赖宿主公开的类型契约和运行时插件协议。

## Workspace Tooling

建议采用 `pnpm workspace`：

- 当前仓库已经有 `pnpm` 使用痕迹
- workspace 依赖联动清晰
- 对多包独立构建、过滤测试和发布都比较顺手

根目录配置职责：

- 声明 workspace 包范围：`packages/*`
- 聚合脚本，例如：
  - `pnpm -r build`
  - `pnpm -r test`
  - `pnpm --filter clipper-cli test`
  - `pnpm --filter clipper-plugin-weixin build`

## Discovery and Local Testing

为了让宿主在仓库内也能像真实环境一样发现插件，建议保留两种测试路径：

### A. Source-level plugin tests

直接测试 `packages/clipper-plugin-weixin/src/...`，用于插件单元测试和构建测试。

### B. Installed-package discovery tests

保留 `tests/fixtures/discovery-app`，但它的依赖来源从手写 `node_modules` fixture 逐步过渡为：

- workspace 安装
- `file:` 指向 `packages/clipper-plugin-weixin`
- 或测试准备阶段将构建产物复制到 fixture app

这样既能覆盖“源码正确”，也能覆盖“宿主能按安装包形态发现它”。

## Publishing Model

发布时两个包分别处理：

- `packages/clipper-cli` → 发布 `clipper-cli`
- `packages/clipper-plugin-weixin` → 发布 `clipper-plugin-weixin`

它们应具备各自的：

- `package.json`
- `version`
- `README.md`
- `files` / `exports` / `bin`（仅 CLI 需要 `bin`）

版本策略可以后续决定：

- 同步版本：两个包一起升版本
- 独立版本：各自按改动单独升版本

初期更建议同步管理流程，但包本身仍保持独立。

## Migration Strategy

迁移建议分阶段进行，避免一次性大搬家导致测试和路径全部失效。

### Phase 1: Workspace Skeleton

- 新增 workspace 根配置
- 创建 `packages/clipper-cli`
- 将当前根包内容迁入 `packages/clipper-cli`
- 在根目录保留聚合脚本和必要转发配置

### Phase 2: Extract Weixin Plugin Package

- 创建 `packages/clipper-plugin-weixin`
- 将当前 `tests/fixtures/.../clipper-plugin-weixin` 的真实逻辑迁为正式源码
- 为插件补独立构建和 README

### Phase 3: Rewire Tests

- 更新测试导入路径和工作目录
- 将 discovery fixture 从手写 `node_modules` 迁到 workspace / file 安装路径
- 保留必要的 broken/conditional fixture，但不再把真实插件源码放在测试目录里

### Phase 4: Publishing Workflow

- 更新根目录 README
- 明确两个包的构建/测试/发布命令
- 如有需要，再补 release 脚本或 Changesets 之类的发版流程

## Trade-offs

### Recommended: `packages/*` Workspace

优点：

- 目录结构清晰，符合 Node monorepo 常见习惯
- 包边界明确
- 最适合你的“同仓库、不同包”目标

缺点：

- 需要一次较大的路径迁移
- 测试与构建脚本要统一重接

### Alternative: Keep CLI at Root, Plugin under `packages/`

即：

- 根目录仍是 `clipper-cli`
- 只把插件放到 `packages/clipper-plugin-weixin`

优点：

- 迁移成本更低

缺点：

- 根目录既是 workspace 根又是发布包，长期容易混乱
- 后续再加第二个、第三个插件时结构会越来越不对称

不推荐作为长期方案。

### Alternative: Separate Repositories

优点：

- 发布边界天然隔离

缺点：

- 联调成本高
- 宿主和插件接口演化需要跨仓库同步

不符合你当前“放在一个目录中存在”的要求。

## Recommendation

采用完整的 `packages/*` workspace 方案：

- 根目录变为 workspace 根
- `clipper-cli` 迁到 `packages/clipper-cli`
- `clipper-plugin-weixin` 建为 `packages/clipper-plugin-weixin`
- 测试 fixture 只保留“安装态验证”，不再承载正式插件源码

这是最稳妥、最可扩展、也最符合未来继续增加站点插件的结构。

## Success Criteria

满足以下条件即视为成功：

- `clipper-cli` 与 `clipper-plugin-weixin` 在同一仓库共存
- 两者各自有独立 `package.json`
- 两者可以分别构建、测试、发布
- 宿主仍可在本地 workspace 环境中发现并加载 `clipper-plugin-weixin`
- 现有测试在新目录结构下继续通过
