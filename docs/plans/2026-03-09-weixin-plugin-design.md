# Weixin Plugin Design

## Goal

将现有 `fetch.js` 的微信公众号单体抓取逻辑迁移为适配当前 `clipper-cli` 架构的外部插件包 `clipper-plugin-weixin`，并保持宿主默认体验为“安装后自动发现、命中微信链接时自动生效”。

## Current State

当前宿主架构将能力拆分为三类插件：

- `collector`：负责 URL 匹配、请求后是否 fallback 到 Playwright、以及 client 选项构造
- `transformer`：负责将 `ctx.artifacts.rawHtml` 规范化为 `ClipperDocument`
- `publisher`：负责输出路径解析和文档落地

现有 `fetch.js` 是单体式流程，顺序串联了：

1. 自定义请求头抓取 HTML
2. 解压响应体
3. 清洗 DOM
4. 提取公众号正文 `#js_content`
5. 提取站内文章链接
6. 转 Markdown
7. 输出 JSON

其中 3-6 都属于当前架构里的 `transformer` 职责，而 1-2 只有一部分对应当前 `collector/request/fallback` 流程。

## Proposed Architecture

### 1. External Plugin Package

新增独立插件包 `clipper-plugin-weixin`，通过当前自动发现机制加载，不在宿主仓库内把它做成“内置默认插件”。插件导出：

- `collectors: [weixinCollector]`
- `transformers: [weixinTransformer]`
- `publishers: []`

这样可以保持宿主核心通用，微信页面的特殊清洗逻辑由外部插件承载。

### 2. Collector Responsibility

`weixinCollector` 只负责采集入口层决策：

- `match(url)`：仅匹配 `mp.weixin.qq.com` 文章页，优先限定 `/s` 路径
- `shouldFallback(result, ctx)`：在请求失败、状态码异常、HTML 不含正文关键节点时触发 Playwright fallback
- `buildClientOptions()`：声明 `waitUntil: 'networkidle'` 和 `waitForSelector: '#js_content'`

它不直接处理 DOM，不输出文档。

### 3. Transformer Responsibility

`weixinTransformer` 负责把微信文章 HTML 规范化为 `ClipperDocument`：

- 从 `ctx.artifacts.rawHtml` 构建 DOM
- 删除 `script/link/style`
- 仅保留 `og:*` 元数据并写入 `document.meta`
- 优先提取 `#js_content` 作为正文主体
- 清洗属性时仅保留对内容有意义的字段：`src`、`data-src`、`href`
- 删除空标签（保留 `img`）
- 提取正文中的公众号站内文章链接并放入 `document.meta.links`
- 将正文 HTML 转为 Markdown
- 返回 `source: 'weixin'` 的标准文档

与原 `fetch.js` 相比，这里不再输出自定义 JSON 结构，而是输出宿主标准 `ClipperDocument`。

### 4. Host Integration Rule

当前宿主默认总是取第一个 transformer，这会导致外部 `weixinTransformer` 即使被发现也不会自动用于微信页面。

因此宿主需要补一个最小、通用的选择规则：

- 优先选择与已解析 `collector.name` 同名的 transformer
- 如果没有同名 transformer，则回退到当前默认 transformer 选择逻辑

这样既能让 `weixin` 自动生效，也不会把宿主耦合到具体站点规则。

## Alternatives Considered

### A. Plugin with Collector Only

只做 `weixinCollector`，继续复用默认 transformer。

不采用，因为这样无法迁移 `fetch.js` 的核心价值：微信公众号正文清洗、链接提取和元数据整理。

### B. Plugin with Manual Config Override

插件提供 transformer，但要求用户在 `clipper.config.*` 里手工把 `weixin` transformer 放到默认 transformer 前面。

不采用，因为自动发现后的使用体验仍然依赖人工配置，和当前“装上即用”的目标不一致。

### C. Make Weixin Built-in

直接把微信处理逻辑并入宿主默认插件。

不采用，因为用户已明确要求做成外部插件包，同时外部包更符合“站点特化逻辑从核心剥离”的方向。

## Data Mapping

原 `fetch.js` 输出字段到新文档结构的映射如下：

- `title` → `document.title`
- `body`(clean html) → `document.content.html`
- `body`(markdown) → `document.content.markdown`
- `og:*` → `document.meta`
- `links` → `document.meta.links`
- 请求 URL → `document.url`
- 固定来源标记 → `document.source = 'weixin'`

## Error Handling

- 非微信文章链接不由该插件处理
- HTML 缺少 `#js_content` 时，transformer 回退到 `document.body` 或返回尽量保守的正文结果
- 若请求层已拿到无效页面，collector 应优先要求 fallback，而不是把解析复杂度推给 transformer
- 插件不应依赖 `fetch.js` 里的硬编码 Cookie；若未来需要认证能力，应单独设计宿主级请求配置扩展

## Testing Strategy

测试按两层展开：

1. 宿主测试
- 验证 registry / collect 流程支持“同名 collector-transformer 自动匹配”
- 验证未命中特化 transformer 时仍回退默认 transformer

2. 插件测试
- 验证 `weixinCollector.match()` 仅命中特定微信公众号 URL
- 验证 `shouldFallback()` 在缺正文节点等场景下返回 true
- 验证 `weixinTransformer` 能抽取 `#js_content`
- 验证 `og:*` 元数据和文章链接被正确写入 `document.meta`
- 验证 Markdown 生成符合预期

## Success Criteria

满足以下条件即视为完成：

- 安装 `clipper-plugin-weixin` 后可被 `clipper plugins` 自动发现
- 对微信公众号文章运行 `clipper collect <url>` 时自动选择 `weixinCollector`
- 宿主自动选择 `weixinTransformer`，无需手工配置覆盖顺序
- 生成的 `ClipperDocument` 含微信正文 HTML、Markdown、OG 元数据和站内文章链接
- 非微信页面继续走现有默认流程，不受影响
