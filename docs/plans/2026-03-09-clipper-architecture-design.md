# Clipper 插件化采集框架设计

## 目标

构建一个可发布到 NPM 的 CLI 优先项目，用于从网页采集内容并通过插件化机制完成解析与本地发布。首版优先支持默认 `request` 采集通道、插件声明的 `client(cdp)` fallback，以及面向本地目录的发布器（如 Obsidian Vault 和通用 Markdown 目录）。

## 设计结论

采用三层插件架构：`collector / transformer / publisher`，并使用 `hook` 作为横切扩展机制。

- `collector` 负责采集阶段，包含默认 `request` 通道和插件定义的 `client(cdp)` fallback。
- `transformer` 负责在 `body`、`response` 等阶段清洗与提取内容，并输出统一文档模型。
- `publisher` 负责将统一文档模型落地到本地目录。
- `hook` 用于在关键生命周期插入自定义逻辑，而不是承载主业务。

## 为什么选择这个架构

相比单流水线 hook 驱动方案，三层插件边界更清晰，能够自然映射用户当前已经明确的两类扩展诉求：采集插件和发布器插件。相比站点适配器优先方案，公共能力不会散落在各插件中，更利于首版形成稳定内核。

这个方案也适合 CLI 优先交付：外部命令简单，内部模块职责清楚，后续新增站点或发布器时不需要重写命令层。

## 运行流程

1. 用户执行 `clipper collect <url> --publisher <name>`。
2. CLI 加载配置文件和插件注册表。
3. 根据 URL 匹配站点 `collector`，或由命令参数显式指定插件。
4. 默认执行 `request` 通道，允许插件在请求前后插入逻辑。
5. 如果请求失败，或插件判定结果不可用，则进入 `client(cdp)` fallback。
6. `transformer` 基于 `response`、`body` 或 DOM 抽取结构化文档。
7. `publisher` 将结构化文档转换为 Markdown 和资源文件并写入目标目录。
8. 在 `--debug` 模式下输出中间产物，便于调试插件与规则。

## 插件模型

### Collector

职责是“拿到原始页面内容”。推荐接口能力：

- `match(url)`：判断插件是否处理该 URL
- `buildRequest(ctx)`：提供请求参数、头信息、cookie、超时等
- `shouldFallback(result, ctx)`：判定是否需要 fallback 到 `client`
- `buildClientOptions(ctx)`：返回 fallback 使用的 CDP 配置
- `collectWithClient(page, ctx)`：可选，自定义 client 抓取逻辑

设计原则：

- 框架内置通用 request collector。
- 插件只描述差异化站点行为。
- fallback 后的 CDP 配置由插件声明，而不是全局统一配置。

### Transformer

职责是“把原始结果转成标准文档”。推荐接口能力：

- `parseResponse(ctx)`：读取状态码、headers、content-type 等
- `extractBody(ctx)`：抽取正文 HTML 或正文文本
- `normalizeDocument(ctx)`：输出统一文档模型

适用场景包括：标题抽取、正文清洗、HTML 转 Markdown、资源 URL 修正、元数据抽取。

### Publisher

职责是“把标准文档落地到本地文件系统”。推荐接口能力：

- `resolveOutput(ctx)`：决定目标目录、文件名、资源目录
- `render(ctx)`：生成 Markdown、frontmatter、资源引用映射
- `publish(ctx)`：执行写入

首版建议内置：

- `markdown`：普通目录落地
- `obsidian`：Obsidian Vault 目录落地

后续可以再加 `siyuan` 等平台型发布器。

## Hook 生命周期

建议支持以下 hook：

- `beforeRequest`
- `afterRequest`
- `beforeFallbackClient`
- `afterClient`
- `beforeBody`
- `afterBody`
- `beforeTransform`
- `afterTransform`
- `beforePublish`
- `afterPublish`
- `onError`

这样既覆盖用户要求的 `client / request / body / response` 阶段，也为发布与错误处理预留扩展点。

## 统一上下文与文档模型

### Context (`ctx`)

所有插件共享运行时上下文对象，建议包含：

- `input`：CLI 参数、URL、输出目录、发布器名
- `runtime`：debug、缓存目录、logger、临时目录
- `request` / `response`
- `client`：browser、page、session 等信息
- `document`：标准文档模型
- `artifacts`：raw html、cleaned html、截图、调试文件

原则上插件只修改自己职责范围内的字段，以保持边界清晰。

### 标准文档模型

建议最少包含：

- `url`
- `title`
- `excerpt`
- `author`
- `publishedAt`
- `content.html`
- `content.markdown`
- `assets[]`
- `meta`
- `source`
- `tags`
- `diagnostics`（仅 debug 下使用）

发布器只消费标准文档模型，不感知采集实现细节。

## CLI 设计

首版推荐命令：

- `clipper collect <url>`
- `clipper publish <input>`
- `clipper plugins list`

其中核心命令是 `clipper collect <url>`，负责完成采集、转换和发布的完整链路。

推荐参数：

- `--publisher <name>`
- `--output <dir>`
- `--plugin <name>`
- `--debug`
- `--format <md|json>`
- `--fallback client`
- `--config <path>`

## 配置文件

推荐使用 `clipper.config.ts` 或 `clipper.config.js`，结构建议分为：

- `defaultCollector`
- `plugins`
- `publishers`
- `runtime`

主要职责是：注册插件、设置默认输出目录、定义调试与缓存策略、覆盖 publisher 行为。

## NPM 首版边界

首版应该聚焦于“一个好用、可扩展、能 publish 的 CLI 核心”，因此建议只保证：

- 单 URL 采集
- 默认 `request` 通道
- 插件控制的 `client(cdp)` fallback
- Markdown / Obsidian 文件落地
- 调试产物输出

首版不做：

- 并发任务队列
- 登录态托管平台
- 远程发布 API
- 自动插件市场
- Web UI

## 错误处理

将错误分为三类：

- `collector error`：请求失败、超时、反爬、client 启动失败
- `transform error`：抽取失败、正文为空、结构异常
- `publisher error`：目录、文件名、资源写入失败

建议所有错误都带稳定的错误码，例如：

- `E_PLUGIN_NOT_FOUND`
- `E_REQUEST_FAILED`
- `E_FALLBACK_FAILED`
- `E_TRANSFORM_EMPTY`
- `E_PUBLISH_FAILED`

CLI 输出时区分：用户可修复错误、站点兼容错误、系统错误。

## 调试产物

`--debug` 模式下建议输出到 `.clipper/debug/<timestamp>/`，包含：

- `request.json`
- `response.json`
- `raw.html`
- `cleaned.html`
- `document.json`
- `screenshot.png`（仅 client fallback 时）

这样便于快速定位错误发生在哪个阶段。

## 测试策略

单元测试优先覆盖：

- URL 匹配
- fallback 判定
- HTML 清洗与 Markdown 转换
- publisher 的输出路径与文件名生成

集成测试聚焦首版关键链路：

- request-only 成功路径
- request 失败后走 client fallback
- markdown / obsidian 发布成功路径

不建议首版依赖大量真实站点在线测试，优先使用 fixture HTML 保证稳定性。

## 推荐目录结构

- `src/cli`
- `src/core`
- `src/collectors`
- `src/transformers`
- `src/publishers`
- `src/hooks`
- `src/types`
- `examples/`
- `docs/plans/`
