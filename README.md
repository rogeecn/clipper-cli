# clipper-cli

一个可发布到 NPM 的 CLI 工具，用于通过插件化 `collector`、`transformer` 和 `publisher` 采集网页内容并落地为 Markdown。

## Features

- 默认 `request` 采集通道
- 插件声明式 `client(cdp)` fallback（Playwright）
- `collector / transformer / publisher + hooks` 插件架构
- `markdown` / `obsidian` 文件落地发布器
- 自动发现当前项目已安装的插件包
- 自动加载 `clipper.config.*` 作为行为覆盖配置
- `--debug` 调试产物输出

## Installation

```bash
npm install clipper-cli
```

## Usage

```bash
clipper collect <url> --publisher markdown --output ./notes
clipper collect <url> --publisher obsidian --output ./vault --debug
clipper publish ./document.json --publisher markdown --output ./notes
clipper plugins
clipper plugins --verbose
```

## Commands

- `clipper collect <url>`：采集页面、转换内容并发布到目标目录
- `clipper publish <input>`：对已有标准文档执行发布
- `clipper plugins`：查看已加载插件
- `clipper plugins --verbose`：查看插件发现与加载诊断

## Config

会自动加载以下配置文件：

- `clipper.config.mjs`
- `clipper.config.js`
- `clipper.config.ts`

配置文件主要用于覆盖行为，而不是注册插件对象。示例：

```ts
export default {
  collectors: [
    {
      name: 'wechat',
      match(url) {
        return url.hostname === 'mp.weixin.qq.com'
      },
      shouldFallback(result) {
        return result.status !== 200
      },
      buildClientOptions() {
        return {
          waitUntil: 'networkidle',
          waitForSelector: '#js_content'
        }
      }
    }
  ],
  transformers: [],
  publishers: []
}
```

内置插件会先加载，随后合并自动发现的已安装插件，最后再应用用户配置中的覆盖项。

## Plugin Authoring

安装到当前项目可解析范围内的插件会被自动发现，无需再在 `clipper.config.*` 中手动注册。推荐使用 `clipper-plugin-*` 或 `@scope/clipper-plugin-*` 包名，并在插件包的 `package.json` 中声明 `clipper.plugin` 元数据：

```json
{
  "name": "clipper-plugin-example",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "clipper": {
    "plugin": true,
    "apiVersion": 1,
    "kind": ["collector", "publisher"],
    "entry": "./dist/index.js"
  }
}
```

插件模块应导出 `default` 或命名导出 `plugin`，并返回包含 `name`、`collectors`、`transformers`、`publishers` 的对象。

本地未发布插件同样支持，只要它已经安装到当前项目：

- `npm install ../clipper-plugin-local`
- `npm install file:../clipper-plugin-local`
- workspace 依赖
- `npm link clipper-plugin-local`

如果你走 `npm link` 工作流，注意它是两步：

```bash
# 在插件目录里注册全局 link
npm link

# 在实际运行 clipper 的项目目录里把插件 link 进当前项目
npm link clipper-plugin-local
```

仅在插件目录里执行一次 `npm link` 还不够；`clipper` 只会发现“当前项目依赖树里可见”的插件，不会把全局 link 自动当作当前项目插件。

另外，插件包需要先产出可导入的构建结果（例如 `dist/index.js`）。如果插件入口指向 `dist`，记得先运行对应的构建命令，再执行 `clipper plugins` 或 `clipper collect`。

可以通过 `clipper plugins` 查看已加载插件；排查问题时使用 `clipper plugins --verbose` 查看发现和加载诊断。

宿主在执行 `collect` 时，会优先选择与当前 `collector` 同名的 `transformer`。如果没有同名 `transformer`，才会回退到默认的第一个 `transformer`。这样像站点专用插件就可以在自动发现后直接接管自己的解析流程，而不用手工调整顺序。

## Weixin Plugin

如果你想把旧的 `fetch.js` 微信公众号抓取流程迁到当前插件架构，可以安装一个外部插件包，例如 `clipper-plugin-weixin`：

```bash
npm install clipper-cli clipper-plugin-weixin
```

安装后，`clipper-plugin-weixin` 会像其他插件一样被自动发现。对于 `mp.weixin.qq.com/s` 文章链接，宿主会自动命中 `weixin` collector，并优先使用与当前 `collector` 同名的 `transformer` 来完成正文提取、OG 元数据整理、站内文章链接抽取和 Markdown 转换。

```bash
clipper collect "https://mp.weixin.qq.com/s?__biz=example" --publisher markdown --output ./notes
```

这条链路的目标是替代原来的 `fetch.js` 单体执行流程，但输出会落到标准 `ClipperDocument` 结构和现有发布器体系中。

## Debug

开启 `--debug` 后，会写入：

- `.clipper/debug/<timestamp>/request.json`
- `.clipper/debug/<timestamp>/response.json`
- `.clipper/debug/<timestamp>/raw.html`
- `.clipper/debug/<timestamp>/cleaned.html`
- `.clipper/debug/<timestamp>/document.json`
- `.clipper/debug/<timestamp>/screenshot.png`（仅 fallback client 时）

## Publish

当前打包入口为 `dist/src/cli/index.js`，已通过：

- `npm run build`
- `npm test`
- `npm pack --dry-run`

发布前建议检查：

```bash
npm version patch
npm publish
```
